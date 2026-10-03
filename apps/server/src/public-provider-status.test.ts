import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  createHttpBoundary,
  type HttpBoundaryHandler,
  type HttpBoundaryHandlers,
} from "./http-boundary.js";
import {
  DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS,
  createProviderRegistry,
} from "./provider-registry.js";
import {
  createProviderStatusHandler,
  createPublicProviderStatusResponse,
  projectPublicProviderStatus,
} from "./public-provider-status.js";

function handlers(status: HttpBoundaryHandler): HttpBoundaryHandlers {
  const unavailable: HttpBoundaryHandler = (_request, response) => {
    response.status(503).end();
  };
  return {
    bootstrap: unavailable,
    agencies: unavailable,
    situation: unavailable,
    chat: unavailable,
    source: unavailable,
    status,
  };
}

describe("public provider status", () => {
  it("projects every and only approved browser fields", () => {
    const internalInput = {
      descriptor: DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.agency,
      freshness: "stale",
      nonSecretErrorCode: "PROVIDER_TIMEOUT",
      serverSecret: "sentinel-server-secret",
      authorization: "Bearer sentinel-authorization",
      internalPath: "C:\\private\\provider.ts",
      providerBody: "sentinel-provider-body",
    } as const;

    const status = projectPublicProviderStatus(internalInput);

    expect(status).toEqual({
      providerName: "live-agency",
      providerMode: "live",
      availability: "unavailable",
      verification: "unverified",
      freshness: "stale",
      fallbackProvider: "bundled-demo",
      nonSecretErrorCode: "PROVIDER_TIMEOUT",
    });
    expect(Object.keys(status).sort()).toEqual(
      [
        "availability",
        "fallbackProvider",
        "freshness",
        "nonSecretErrorCode",
        "providerMode",
        "providerName",
        "verification",
      ].sort(),
    );
    expect(JSON.stringify(status)).not.toContain("schemaVersion");
    expect(JSON.stringify(status)).not.toContain("sentinel");
    expect(JSON.stringify(status)).not.toContain("private");
  });

  it("reports every disabled optional integration unavailable with its active fallback", () => {
    const response = createPublicProviderStatusResponse(
      createProviderRegistry(),
      "request.status-defaults",
    );

    expect(response.ok).toBe(true);
    expect(response.providers).toHaveLength(3);
    for (const provider of response.providers) {
      expect(provider).toMatchObject({
        providerMode: "live",
        availability: "unavailable",
        verification: "unverified",
        freshness: "unavailable",
        nonSecretErrorCode: null,
      });
      expect(provider.fallbackProvider.length).toBeGreaterThan(0);
    }
  });

  it("serves a strict status response with only safe runtime diagnostics", async () => {
    const getRuntimeStatus = vi.fn(() => ({
      agency_data: {
        freshness: "stale" as const,
        nonSecretErrorCode: "PROVIDER_TIMEOUT" as const,
      },
    }));
    const app = createHttpBoundary(
      handlers(createProviderStatusHandler({ getRuntimeStatus })),
      { requestIdFactory: () => "request.status-route" },
    );

    const response = await request(app).get("/api/v1/status").expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      requestId: "request.status-route",
      providers: expect.arrayContaining([
        expect.objectContaining({
          providerName: "live-agency",
          freshness: "stale",
          fallbackProvider: "bundled-demo",
          nonSecretErrorCode: "PROVIDER_TIMEOUT",
        }),
      ]),
    });
    expect(getRuntimeStatus).toHaveBeenCalledOnce();
    expect(JSON.stringify(response.body)).not.toContain("schemaVersion");
  });

  it("fails closed when runtime status contains a disallowed value", () => {
    expect(() =>
      projectPublicProviderStatus({
        descriptor: DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.externalModel,
        freshness: "guessed-current",
        nonSecretErrorCode: "RAW_PROVIDER_EXCEPTION",
      }),
    ).toThrow();
  });
});
