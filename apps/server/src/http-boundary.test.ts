import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  API_ROUTE_TABLE,
  createHttpBoundary,
  type HttpBoundaryHandler,
  type HttpBoundaryHandlers,
} from "./http-boundary.js";

function createHandlers(
  overrides: Partial<HttpBoundaryHandlers> = {},
): HttpBoundaryHandlers {
  const ok: HttpBoundaryHandler = (_request, response) => {
    response.status(200).json({ ok: true, validated: response.locals.validated });
  };
  return {
    bootstrap: vi.fn(ok),
    agencies: vi.fn(ok),
    situation: vi.fn(ok),
    chat: vi.fn(ok),
    source: vi.fn(ok),
    status: vi.fn(ok),
    ...overrides,
  };
}

describe("HttpBoundary", () => {
  it("publishes only the six documented method/path pairs", () => {
    expect(API_ROUTE_TABLE).toEqual([
      { key: "bootstrap", method: "GET", path: "/api/v1/bootstrap" },
      { key: "agencies", method: "GET", path: "/api/v1/agencies" },
      { key: "situation", method: "GET", path: "/api/v1/situation" },
      { key: "chat", method: "POST", path: "/api/v1/chat" },
      {
        key: "source",
        method: "GET",
        path: "/api/v1/sources/:corpusVersion/:recordId",
      },
      { key: "status", method: "GET", path: "/api/v1/status" },
    ]);
  });

  it("passes only validated query and path values to an application handler", async () => {
    const handlers = createHandlers();
    const app = createHttpBoundary(handlers, {
      requestIdFactory: () => "request.test-source",
    });

    const response = await request(app).get(
      "/api/v1/sources/corpus-v1/record.123?lang=ms",
    );

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBe("request.test-source");
    expect(response.body.validated).toEqual({
      params: { corpusVersion: "corpus-v1", recordId: "record.123" },
      query: { lang: "ms" },
      body: null,
    });
    expect(handlers.source).toHaveBeenCalledOnce();
  });

  it("rejects unknown query fields, duplicate values, and invalid path values before handlers", async () => {
    const handlers = createHandlers();
    const app = createHttpBoundary(handlers);

    const [unknown, duplicate, invalidPath] = await Promise.all([
      request(app).get("/api/v1/bootstrap?lang=en&extra=value"),
      request(app).get("/api/v1/agencies?lang=en&lang=ms"),
      request(app).get("/api/v1/sources/not%20valid/record?lang=en"),
    ]);

    for (const response of [unknown, duplicate, invalidPath]) {
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        ok: false,
        code: "VALIDATION_BODY",
        messageKey: "errors.validation",
        retryable: false,
      });
    }
    expect(handlers.bootstrap).not.toHaveBeenCalled();
    expect(handlers.agencies).not.toHaveBeenCalled();
    expect(handlers.source).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types, malformed JSON, unknown fields, and invalid values without processing", async () => {
    const handlers = createHandlers();
    const app = createHttpBoundary(handlers);
    const validBody = {
      language: "en",
      question: "What should I prepare?",
      corpusVersion: "corpus-v1",
    };

    const [wrongType, malformed, unknownField, invalidValue] = await Promise.all([
      request(app).post("/api/v1/chat").type("text").send("not-json"),
      request(app)
        .post("/api/v1/chat")
        .set("Content-Type", "application/json")
        .send('{"language":"en"'),
      request(app)
        .post("/api/v1/chat")
        .send({ ...validBody, exactAddress: "sentinel-address" }),
      request(app).post("/api/v1/chat").send({ ...validBody, language: "fr" }),
    ]);

    expect(wrongType.status).toBe(415);
    expect(wrongType.body.code).toBe("VALIDATION_CONTENT_TYPE");
    for (const response of [malformed, unknownField, invalidValue]) {
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_BODY");
      expect(response.body.messageKey).toBe("errors.validation");
    }
    expect(handlers.chat).not.toHaveBeenCalled();
  });

  it("uses UTF-8 bytes for the inclusive 4,096-byte chat question limit", async () => {
    const chat = vi.fn<HttpBoundaryHandler>((_request, response) => {
      response.status(204).end();
    });
    const handlers = createHandlers({ chat });
    const app = createHttpBoundary(handlers);
    const base = { language: "ms", corpusVersion: "corpus-v1" };

    const exact = await request(app)
      .post("/api/v1/chat")
      .send({ ...base, question: "é".repeat(2_048) });
    const over = await request(app)
      .post("/api/v1/chat")
      .send({ ...base, question: "é".repeat(2_049) });

    expect(exact.status).toBe(204);
    expect(over.status).toBe(413);
    expect(over.body).toMatchObject({
      ok: false,
      code: "VALIDATION_SIZE",
      messageKey: "errors.validation",
      retryable: false,
    });
    expect(chat).toHaveBeenCalledOnce();
  });

  it("blocks undocumented methods and paths instead of Express HEAD fallthrough", async () => {
    const handlers = createHandlers();
    const app = createHttpBoundary(handlers);

    const [head, wrongMethod, wrongPath] = await Promise.all([
      request(app).head("/api/v1/bootstrap?lang=en"),
      request(app).post("/api/v1/status").send({}),
      request(app).get("/api/v1/not-a-route"),
    ]);

    expect(head.status).toBe(404);
    expect(wrongMethod.status).toBe(404);
    expect(wrongPath.status).toBe(404);
    expect(handlers.bootstrap).not.toHaveBeenCalled();
    expect(handlers.status).not.toHaveBeenCalled();
  });

  it("ignores caller request IDs and returns a safe generic final error", async () => {
    const status: HttpBoundaryHandler = () => {
      throw new Error(
        "sentinel-secret Authorization: Bearer token C:\\internal\\server.ts",
      );
    };
    const handlers = createHandlers({ status });
    const app = createHttpBoundary(handlers, {
      requestIdFactory: () => "request.generated-safe",
    });

    const response = await request(app)
      .get("/api/v1/status")
      .set("X-Request-Id", "caller.supplied-secret");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      requestId: "request.generated-safe",
      code: "INTERNAL_ERROR",
      messageKey: "errors.serverUnavailable",
      retryable: true,
    });
    expect(response.headers["x-request-id"]).toBe("request.generated-safe");
    expect(JSON.stringify(response.body)).not.toContain("sentinel-secret");
    expect(JSON.stringify(response.body)).not.toContain("internal");
  });
});
