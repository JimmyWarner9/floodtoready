import { randomUUID } from "node:crypto";

import {
  chatRequestSchema,
  languageSchema,
  versionSchema,
  type ApiError,
  type ApiErrorCode,
  type ChatRequest,
} from "@banjir-ready/contracts";
import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";

import {
  configureTrustedProxy,
  createOperationalLoggingMiddleware,
  requireEncryptedTransport,
  securityHeadersMiddleware,
  setSafeErrorLogContext,
  type OperationalLogger,
  type TrustedProxyConfiguration,
} from "./server-security.js";

const API_PREFIX = "/api/v1";
const CHAT_QUESTION_MAX_UTF8_BYTES = 4_096;
const JSON_BODY_MAX_BYTES = 32 * 1_024;
const DIRECTORY_QUERY_MAX_LENGTH = 256;
const SAFE_REQUEST_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const SAFE_PATH_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;

export const API_ROUTE_TABLE = Object.freeze([
  Object.freeze({
    key: "bootstrap",
    method: "GET",
    path: `${API_PREFIX}/bootstrap`,
  }),
  Object.freeze({
    key: "agencies",
    method: "GET",
    path: `${API_PREFIX}/agencies`,
  }),
  Object.freeze({
    key: "situation",
    method: "GET",
    path: `${API_PREFIX}/situation`,
  }),
  Object.freeze({
    key: "chat",
    method: "POST",
    path: `${API_PREFIX}/chat`,
  }),
  Object.freeze({
    key: "source",
    method: "GET",
    path: `${API_PREFIX}/sources/:corpusVersion/:recordId`,
  }),
  Object.freeze({
    key: "status",
    method: "GET",
    path: `${API_PREFIX}/status`,
  }),
] as const);

export type HttpBoundaryRouteKey = (typeof API_ROUTE_TABLE)[number]["key"];

export interface ValidatedHttpInput {
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body: ChatRequest | null;
}

export interface HttpBoundaryLocals extends Record<string, unknown> {
  requestId: string;
  validated: ValidatedHttpInput;
}

export type HttpBoundaryHandler = RequestHandler<
  Record<string, string>,
  unknown,
  unknown,
  Record<string, unknown>,
  HttpBoundaryLocals
>;

export type HttpBoundaryHandlers = Readonly<
  Record<HttpBoundaryRouteKey, HttpBoundaryHandler>
>;

export interface HttpBoundaryOptions {
  readonly requestIdFactory?: () => string;
  readonly trustedProxy?: TrustedProxyConfiguration;
  readonly logger?: OperationalLogger;
  readonly now?: () => number;
}

class HttpBoundaryError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(code);
    this.name = "HttpBoundaryError";
  }
}

const errorMessageKeys: Readonly<Record<ApiErrorCode, string>> = {
  VALIDATION_CONTENT_TYPE: "errors.validation",
  VALIDATION_BODY: "errors.validation",
  VALIDATION_SIZE: "errors.validation",
  NOT_FOUND: "errors.invalidRequest",
  PROVIDER_TIMEOUT: "errors.serverUnavailable",
  PROVIDER_INVALID_RESPONSE: "errors.serverUnavailable",
  SOURCE_UNAVAILABLE: "errors.serverUnavailable",
  INTERNAL_ERROR: "errors.serverUnavailable",
};

function makeSafeRequestId(factory: () => string): string {
  try {
    const candidate = factory();
    if (SAFE_REQUEST_ID.test(candidate)) return candidate;
  } catch {
    // Request IDs are diagnostics only. A local random value is the safe fallback.
  }
  return randomUUID();
}

function requestIdMiddleware(factory: () => string): RequestHandler {
  return (_request, response, next) => {
    const requestId = makeSafeRequestId(factory);
    response.locals.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  };
}

function rejectUndocumentedRoute(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const methodAndPath = `${request.method} ${API_PREFIX}${request.path}`;
  const isDocumented = API_ROUTE_TABLE.some((route) => {
    if (route.key === "source") {
      return (
        request.method === route.method &&
        /^GET \/api\/v1\/sources\/[^/]+\/[^/]+$/.test(methodAndPath)
      );
    }
    return methodAndPath === `${route.method} ${route.path}`;
  });

  if (!isDocumented) {
    next(new HttpBoundaryError("NOT_FOUND", 404));
    return;
  }
  next();
}

function rejectGetBody(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const contentLength = request.get("content-length");
  const hasBody =
    request.get("transfer-encoding") !== undefined ||
    (contentLength !== undefined && contentLength !== "0");
  if (hasBody) {
    next(new HttpBoundaryError("VALIDATION_BODY", 400));
    return;
  }
  next();
}

function requireJsonContentType(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const contentType = request.get("content-type");
  if (
    contentType === undefined ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)
  ) {
    next(new HttpBoundaryError("VALIDATION_CONTENT_TYPE", 415));
    return;
  }
  next();
}

function readExactQuery(
  request: Request,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Record<string, string> {
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const actualKeys = Object.keys(request.query);
  if (
    actualKeys.some((key) => !allowed.has(key)) ||
    requiredKeys.some((key) => !actualKeys.includes(key))
  ) {
    throw new HttpBoundaryError("VALIDATION_BODY", 400);
  }

  const result: Record<string, string> = {};
  for (const key of actualKeys) {
    const value: unknown = request.query[key];
    if (typeof value !== "string") {
      throw new HttpBoundaryError("VALIDATION_BODY", 400);
    }
    result[key] = value;
  }
  return result;
}

function validateLanguageQuery(
  request: Request,
  response: Response<unknown, HttpBoundaryLocals>,
  next: NextFunction,
): void {
  try {
    const query = readExactQuery(request, ["lang"]);
    const language = languageSchema.safeParse(query.lang);
    if (!language.success) throw new HttpBoundaryError("VALIDATION_BODY", 400);
    setValidatedInput(response, {}, { lang: language.data }, null);
    next();
  } catch (error: unknown) {
    next(error);
  }
}

function validateAgenciesQuery(
  request: Request,
  response: Response<unknown, HttpBoundaryLocals>,
  next: NextFunction,
): void {
  try {
    const query = readExactQuery(request, ["lang"], ["q"]);
    const language = languageSchema.safeParse(query.lang);
    if (!language.success) throw new HttpBoundaryError("VALIDATION_BODY", 400);

    const validatedQuery: Record<string, string> = { lang: language.data };
    if (query.q !== undefined) {
      if (query.q.length > DIRECTORY_QUERY_MAX_LENGTH) {
        throw new HttpBoundaryError("VALIDATION_BODY", 400);
      }
      validatedQuery.q = query.q.trim();
    }
    setValidatedInput(response, {}, validatedQuery, null);
    next();
  } catch (error: unknown) {
    next(error);
  }
}

function validateNoQuery(
  request: Request,
  response: Response<unknown, HttpBoundaryLocals>,
  next: NextFunction,
): void {
  try {
    const query = readExactQuery(request, []);
    setValidatedInput(response, {}, query, null);
    next();
  } catch (error: unknown) {
    next(error);
  }
}

function validateSourceRequest(
  request: Request<Record<string, string>>,
  response: Response<unknown, HttpBoundaryLocals>,
  next: NextFunction,
): void {
  try {
    const query = readExactQuery(request, ["lang"]);
    const language = languageSchema.safeParse(query.lang);
    const corpusVersion = versionSchema.safeParse(request.params.corpusVersion);
    const recordId = request.params.recordId;
    if (
      !language.success ||
      !corpusVersion.success ||
      recordId === undefined ||
      !SAFE_PATH_ID.test(recordId)
    ) {
      throw new HttpBoundaryError("VALIDATION_BODY", 400);
    }
    setValidatedInput(
      response,
      { corpusVersion: corpusVersion.data, recordId },
      { lang: language.data },
      null,
    );
    next();
  } catch (error: unknown) {
    next(error);
  }
}

function validateChatBody(
  request: Request,
  response: Response<unknown, HttpBoundaryLocals>,
  next: NextFunction,
): void {
  try {
    const untrustedBody: unknown = request.body;
    if (
      typeof untrustedBody === "object" &&
      untrustedBody !== null &&
      "question" in untrustedBody &&
      typeof untrustedBody.question === "string" &&
      Buffer.byteLength(untrustedBody.question, "utf8") >
        CHAT_QUESTION_MAX_UTF8_BYTES
    ) {
      throw new HttpBoundaryError("VALIDATION_SIZE", 413);
    }

    const parsed = chatRequestSchema.safeParse(untrustedBody);
    if (!parsed.success) throw new HttpBoundaryError("VALIDATION_BODY", 400);
    setValidatedInput(response, {}, {}, parsed.data);
    next();
  } catch (error: unknown) {
    next(error);
  }
}

function setValidatedInput(
  response: Response<unknown, HttpBoundaryLocals>,
  params: Record<string, string>,
  query: Record<string, string>,
  body: ChatRequest | null,
): void {
  response.locals.validated = Object.freeze({
    params: Object.freeze({ ...params }),
    query: Object.freeze({ ...query }),
    body: body === null ? null : Object.freeze({ ...body }),
  });
}

function invoke(handler: HttpBoundaryHandler): HttpBoundaryHandler {
  return (request, response, next) => {
    try {
      Promise.resolve(handler(request, response, next)).catch(next);
    } catch (error: unknown) {
      next(error);
    }
  };
}

function notFoundHandler(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next(new HttpBoundaryError("NOT_FOUND", 404));
}

export const finalHttpErrorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  void next;
  const boundaryResponse = response as Response<unknown, HttpBoundaryLocals>;
  if (boundaryResponse.headersSent) return;

  let boundaryError: HttpBoundaryError;
  if (error instanceof HttpBoundaryError) {
    boundaryError = error;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    boundaryError = new HttpBoundaryError("VALIDATION_SIZE", 413);
  } else if (error instanceof SyntaxError || error instanceof URIError) {
    boundaryError = new HttpBoundaryError("VALIDATION_BODY", 400);
  } else {
    boundaryError = new HttpBoundaryError("INTERNAL_ERROR", 500, true);
  }

  setSafeErrorLogContext(boundaryResponse, boundaryError.code);
  const requestId =
    typeof boundaryResponse.locals.requestId === "string" &&
    SAFE_REQUEST_ID.test(boundaryResponse.locals.requestId)
      ? boundaryResponse.locals.requestId
      : randomUUID();
  const payload: ApiError = {
    ok: false,
    requestId,
    code: boundaryError.code,
    messageKey: errorMessageKeys[boundaryError.code],
    retryable: boundaryError.retryable,
  };
  boundaryResponse.status(boundaryError.status).json(payload);
};

export function createHttpBoundary(
  handlers: HttpBoundaryHandlers,
  options: HttpBoundaryOptions = {},
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  configureTrustedProxy(app, options.trustedProxy);

  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware(options.requestIdFactory ?? randomUUID));
  app.use(
    createOperationalLoggingMiddleware(API_ROUTE_TABLE, {
      ...(options.logger === undefined ? {} : { logger: options.logger }),
      ...(options.now === undefined ? {} : { now: options.now }),
    }),
  );

  const router = express.Router({ caseSensitive: true, strict: true });
  router.use(rejectUndocumentedRoute);

  router.get(
    "/bootstrap",
    rejectGetBody,
    validateLanguageQuery,
    invoke(handlers.bootstrap),
  );
  router.get(
    "/agencies",
    rejectGetBody,
    validateAgenciesQuery,
    invoke(handlers.agencies),
  );
  router.get(
    "/situation",
    rejectGetBody,
    validateLanguageQuery,
    invoke(handlers.situation),
  );
  router.post(
    "/chat",
    requireEncryptedTransport(
      () => new HttpBoundaryError("VALIDATION_BODY", 426),
    ),
    requireJsonContentType,
    express.json({ limit: JSON_BODY_MAX_BYTES, strict: true, type: () => true }),
    validateChatBody,
    invoke(handlers.chat),
  );
  router.get(
    "/sources/:corpusVersion/:recordId",
    rejectGetBody,
    validateSourceRequest,
    invoke(handlers.source),
  );
  router.get(
    "/status",
    rejectGetBody,
    validateNoQuery,
    invoke(handlers.status),
  );
  router.use(notFoundHandler);
  router.use(finalHttpErrorMiddleware);

  app.use(API_PREFIX, router);
  app.use(notFoundHandler);
  app.use(finalHttpErrorMiddleware);
  return app;
}
