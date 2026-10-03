import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  createHttpBoundary,
  type HttpBoundaryHandler,
  type HttpBoundaryHandlers,
} from "./http-boundary.js";
import {
  SECURITY_HEADERS,
  setProviderLogContext,
  type OperationalLogRecord,
} from "./server-security.js";

function createHandlers(
  overrides: Partial<HttpBoundaryHandlers> = {},
): HttpBoundaryHandlers {
  const ok: HttpBoundaryHandler = (_request, response) => {
    response.status(200).json({ ok: true });
  };
  return {
    bootstrap: ok,
    agencies: ok,
    situation: ok,
    chat: ok,
    source: ok,
    status: ok,
    ...overrides,
  };
}

describe("server HTTP security controls", () => {
  it("sends restrictive security headers on successful and error responses", async () => {
    const app = createHttpBoundary(createHandlers());
    const [success, failure] = await Promise.all([
      request(app).get("/api/v1/status"),
      request(app).get("/not-documented"),
    ]);

    for (const response of [success, failure]) {
      expect(response.headers["content-security-policy"]).toBe(
        SECURITY_HEADERS["Content-Security-Policy"],
      );
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["referrer-policy"]).toBe("no-referrer");
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-powered-by"]).toBeUndefined();
    }
  });

  it("requires encrypted chat transport outside localhost and ignores untrusted proxy headers", async () => {
    const chat = vi.fn<HttpBoundaryHandler>((_request, response) => {
      response.status(204).end();
    });
    const body = {
      language: "en",
      question: "What should I prepare?",
      corpusVersion: "corpus-v1",
    };
    const withoutTrust = createHttpBoundary(createHandlers({ chat }));

    const [plain, spoofed, localhost] = await Promise.all([
      request(withoutTrust).post("/api/v1/chat").set("Host", "app.example").send(body),
      request(withoutTrust)
        .post("/api/v1/chat")
        .set("Host", "app.example")
        .set("X-Forwarded-Proto", "https")
        .send(body),
      request(withoutTrust)
        .post("/api/v1/chat")
        .set("Host", "localhost:3000")
        .send(body),
    ]);

    expect(plain.status).toBe(426);
    expect(spoofed.status).toBe(426);
    expect(localhost.status).toBe(204);
    expect(chat).toHaveBeenCalledOnce();

    const trustedChat = vi.fn<HttpBoundaryHandler>((_request, response) => {
      response.status(204).end();
    });
    const withExplicitTrust = createHttpBoundary(
      createHandlers({ chat: trustedChat }),
      { trustedProxy: "loopback" },
    );
    const forwardedTls = await request(withExplicitTrust)
      .post("/api/v1/chat")
      .set("Host", "app.example")
      .set("X-Forwarded-Proto", "https")
      .send(body);

    expect(forwardedTls.status).toBe(204);
    expect(trustedChat).toHaveBeenCalledOnce();
  });

  it("projects only allowlisted operational fields and excludes request/provider secrets", async () => {
    const records: OperationalLogRecord[] = [];
    const chat: HttpBoundaryHandler = (_request, response) => {
      setProviderLogContext(response, "verified-provider", "live");
      response.status(200).json({ ok: true });
    };
    const times = [1_000, 1_025];
    const app = createHttpBoundary(createHandlers({ chat }), {
      requestIdFactory: () => "request.safe",
      logger: { write: (record) => records.push(record) },
      now: () => times.shift() ?? 1_025,
    });

    await request(app)
      .post("/api/v1/chat?sentinel-query=secret")
      .set("Host", "localhost")
      .set("Authorization", "Bearer sentinel-authorization")
      .send({
        language: "en",
        question: "sentinel-chat-text",
        corpusVersion: "corpus-v1",
      })
      .expect(200);

    expect(records).toEqual([
      {
        requestId: "request.safe",
        route: "/api/v1/chat",
        status: 200,
        durationMs: 25,
        safeErrorCode: null,
        providerName: "verified-provider",
        providerMode: "live",
      },
    ]);
    expect(Object.keys(records[0] ?? {}).sort()).toEqual(
      [
        "durationMs",
        "providerMode",
        "providerName",
        "requestId",
        "route",
        "safeErrorCode",
        "status",
      ].sort(),
    );
    const serialized = JSON.stringify(records);
    for (const marker of [
      "sentinel-query",
      "sentinel-authorization",
      "sentinel-chat-text",
      "Bearer",
    ]) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("logs safe error codes without exception messages, stacks, paths, or bodies", async () => {
    const records: OperationalLogRecord[] = [];
    const status: HttpBoundaryHandler = () => {
      throw new Error(
        "sentinel-provider-body Authorization C:\\private\\adapter.ts",
      );
    };
    const app = createHttpBoundary(createHandlers({ status }), {
      requestIdFactory: () => "request.exception",
      logger: { write: (record) => records.push(record) },
      now: () => 42,
    });

    await request(app).get("/api/v1/status").expect(500);

    expect(records).toEqual([
      {
        requestId: "request.exception",
        route: "/api/v1/status",
        status: 500,
        durationMs: 0,
        safeErrorCode: "INTERNAL_ERROR",
        providerName: null,
        providerMode: null,
      },
    ]);
    expect(JSON.stringify(records)).not.toMatch(
      /sentinel-provider-body|Authorization|private|adapter\.ts/,
    );
  });
});
