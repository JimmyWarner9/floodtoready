import type { ApiErrorCode } from "@banjir-ready/contracts";
import type {
  Express,
  Request,
  RequestHandler,
  Response,
} from "express";

import type { OptionalProviderMode } from "./optional-provider-boundary.js";

export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
});

export type TrustedProxyConfiguration =
  | number
  | string
  | readonly string[]
  | ((ipAddress: string) => boolean);

export interface DocumentedRoute {
  readonly method: string;
  readonly path: string;
}

export interface OperationalLogRecord {
  readonly requestId: string;
  readonly route: string;
  readonly status: number;
  readonly durationMs: number;
  readonly safeErrorCode: ApiErrorCode | null;
  readonly providerName: string | null;
  readonly providerMode: OptionalProviderMode | null;
}

export interface OperationalLogger {
  write(record: OperationalLogRecord): void;
}

export interface OperationalLoggingOptions {
  readonly logger?: OperationalLogger;
  readonly now?: () => number;
}

interface RequestDiagnosticState {
  providerName: string | null;
  providerMode: OptionalProviderMode | null;
  safeErrorCode: ApiErrorCode | null;
}

const UNMATCHED_ROUTE = "UNMATCHED";
const SAFE_PROVIDER_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const responseDiagnostics = new WeakMap<Response, RequestDiagnosticState>();
const NOOP_LOGGER: OperationalLogger = Object.freeze({ write: () => undefined });

function validateTrustedProxy(configuration: TrustedProxyConfiguration): void {
  if (typeof configuration === "number") {
    if (!Number.isSafeInteger(configuration) || configuration < 0) {
      throw new TypeError("Trusted proxy hop count must be a non-negative integer");
    }
    return;
  }
  if (typeof configuration === "string") {
    if (configuration.trim().length === 0) {
      throw new TypeError("Trusted proxy configuration cannot be empty");
    }
    return;
  }
  if (Array.isArray(configuration)) {
    if (
      configuration.length === 0 ||
      configuration.some(
        (entry) => typeof entry !== "string" || entry.trim().length === 0,
      )
    ) {
      throw new TypeError("Trusted proxy list must contain non-empty entries");
    }
    return;
  }
  if (typeof configuration !== "function") {
    throw new TypeError("Trusted proxy configuration is invalid");
  }
}

export function configureTrustedProxy(
  app: Express,
  configuration: TrustedProxyConfiguration | undefined,
): void {
  if (configuration === undefined) {
    app.set("trust proxy", false);
    return;
  }

  validateTrustedProxy(configuration);
  app.set(
    "trust proxy",
    Array.isArray(configuration) ? [...configuration] : configuration,
  );
}

export const securityHeadersMiddleware: RequestHandler = (
  _request,
  response,
  next,
) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
  next();
};

function readHostName(hostHeader: string | undefined): string | null {
  if (hostHeader === undefined) return null;
  const host = hostHeader.trim().toLowerCase();
  const ipv6 = /^\[([^\]]+)\](?::(\d{1,5}))?$/.exec(host);
  if (ipv6 !== null) {
    const port = ipv6[2];
    if (port !== undefined && Number(port) > 65_535) return null;
    return ipv6[1] ?? null;
  }

  const match = /^([^:]+)(?::(\d{1,5}))?$/.exec(host);
  if (match === null) return null;
  const port = match[2];
  if (port !== undefined && Number(port) > 65_535) return null;
  return match[1] ?? null;
}

export function isLocalhostRequest(request: Request): boolean {
  const hostname = readHostName(request.get("host"));
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function requireEncryptedTransport(
  makeError: () => unknown,
): RequestHandler {
  return (request, _response, next) => {
    if (isLocalhostRequest(request) || request.secure) {
      next();
      return;
    }
    next(makeError());
  };
}

function routeMatches(requestPath: string, routePath: string): boolean {
  const requestSegments = requestPath.split("/");
  const routeSegments = routePath.split("/");
  if (requestSegments.length !== routeSegments.length) return false;

  return routeSegments.every((segment, index) => {
    const requestSegment = requestSegments[index];
    if (segment.startsWith(":")) return requestSegment !== undefined && requestSegment.length > 0;
    return segment === requestSegment;
  });
}

function resolveRouteTemplate(
  request: Request,
  routes: readonly DocumentedRoute[],
): string {
  return (
    routes.find(
      (route) =>
        route.method === request.method && routeMatches(request.path, route.path),
    )?.path ?? UNMATCHED_ROUTE
  );
}

function readNow(now: () => number): number {
  try {
    const value = now();
    return Number.isFinite(value) ? value : Date.now();
  } catch {
    return Date.now();
  }
}

export function createOperationalLoggingMiddleware(
  routes: readonly DocumentedRoute[],
  options: OperationalLoggingOptions = {},
): RequestHandler {
  const logger = options.logger ?? NOOP_LOGGER;
  const now = options.now ?? Date.now;

  return (request, response, next) => {
    const startedAt = readNow(now);
    const route = resolveRouteTemplate(request, routes);
    const state: RequestDiagnosticState = {
      providerName: null,
      providerMode: null,
      safeErrorCode: null,
    };
    responseDiagnostics.set(response, state);
    let emitted = false;

    const emit = (status: number): void => {
      if (emitted) return;
      emitted = true;
      const durationMs = Math.max(0, Math.trunc(readNow(now) - startedAt));
      const requestId =
        typeof response.locals.requestId === "string"
          ? response.locals.requestId
          : "unavailable";
      const record = Object.freeze({
        requestId,
        route,
        status,
        durationMs,
        safeErrorCode: state.safeErrorCode,
        providerName: state.providerName,
        providerMode: state.providerMode,
      });
      responseDiagnostics.delete(response);
      try {
        logger.write(record);
      } catch {
        // Logging failures must not change request handling.
      }
    };

    response.once("finish", () => emit(response.statusCode));
    response.once("close", () => emit(response.writableFinished ? response.statusCode : 499));
    next();
  };
}

export function setProviderLogContext(
  response: Response,
  providerName: string,
  providerMode: OptionalProviderMode,
): void {
  if (
    !SAFE_PROVIDER_NAME.test(providerName) ||
    (providerMode !== "demo" && providerMode !== "live")
  ) {
    throw new TypeError("Provider logging context is invalid");
  }

  const state = responseDiagnostics.get(response);
  if (state === undefined) return;
  state.providerName = providerName;
  state.providerMode = providerMode;
}

export function setSafeErrorLogContext(
  response: Response,
  safeErrorCode: ApiErrorCode,
): void {
  const state = responseDiagnostics.get(response);
  if (state === undefined) return;
  state.safeErrorCode = safeErrorCode;
}
