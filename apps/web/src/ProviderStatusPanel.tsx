import {
  parseApiError,
  parseProviderStatus,
  parseProviderStatusResponse,
  type ApiErrorCode,
  type ProviderStatus,
  type ProviderStatusResponse,
} from "@banjir-ready/contracts";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ClientOperationStateView,
  type ClientOperationState,
} from "./ClientOperationState";
import { useLanguage } from "./localization/LanguageProvider";
import type { MessageKey } from "./localization/resources";

const STATUS_RESPONSE_MAX_BYTES = 64 * 1_024;
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i;

export const DEFAULT_CREDENTIAL_FREE_PROVIDER_STATUSES: readonly Readonly<ProviderStatus>[] =
  Object.freeze(
    [
      {
        providerName: "live-agency",
        providerMode: "live",
        availability: "unavailable",
        verification: "unverified",
        freshness: "unavailable",
        fallbackProvider: "bundled-demo",
        nonSecretErrorCode: null,
      },
      {
        providerName: "external-model",
        providerMode: "live",
        availability: "unavailable",
        verification: "unverified",
        freshness: "unavailable",
        fallbackProvider: "deterministic-template",
        nonSecretErrorCode: null,
      },
      {
        providerName: "remote-semantic-retrieval",
        providerMode: "live",
        availability: "unavailable",
        verification: "unverified",
        freshness: "unavailable",
        fallbackProvider: "deterministic-local-retrieval",
        nonSecretErrorCode: null,
      },
    ].map((status) => Object.freeze(parseProviderStatus(status))),
  );

export interface ProviderStatusClient {
  load(signal?: AbortSignal): Promise<Readonly<ProviderStatusResponse>>;
}

export interface ProviderStatusPanelProps {
  readonly client?: ProviderStatusClient;
  readonly initialStatuses?: readonly Readonly<ProviderStatus>[];
}

export class ProviderStatusClientError extends Error {
  public constructor(public readonly safeCode: ApiErrorCode | null) {
    super("Provider status request failed");
    this.name = "ProviderStatusClientError";
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (
    response.redirected ||
    contentType === null ||
    !JSON_CONTENT_TYPE.test(contentType)
  ) {
    throw new ProviderStatusClientError("PROVIDER_INVALID_RESPONSE");
  }

  const bodyText = await response.text();
  if (new TextEncoder().encode(bodyText).byteLength > STATUS_RESPONSE_MAX_BYTES) {
    throw new ProviderStatusClientError("PROVIDER_INVALID_RESPONSE");
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new ProviderStatusClientError("PROVIDER_INVALID_RESPONSE");
  }
}

export function createProviderStatusClient(
  fetchImplementation: typeof fetch = fetch,
): ProviderStatusClient {
  return Object.freeze({
    async load(signal?: AbortSignal): Promise<Readonly<ProviderStatusResponse>> {
      let response: Response;
      try {
        response = await fetchImplementation("/api/v1/status", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          ...(signal === undefined ? {} : { signal }),
        });
      } catch {
        throw new ProviderStatusClientError("SOURCE_UNAVAILABLE");
      }

      const untrustedBody = await readBoundedJson(response);
      if (response.status !== 200) {
        try {
          const error = parseApiError(untrustedBody);
          throw new ProviderStatusClientError(error.code);
        } catch (error: unknown) {
          if (error instanceof ProviderStatusClientError) throw error;
          throw new ProviderStatusClientError(null);
        }
      }

      try {
        return Object.freeze(parseProviderStatusResponse(untrustedBody));
      } catch {
        throw new ProviderStatusClientError("PROVIDER_INVALID_RESPONSE");
      }
    },
  });
}

const DEFAULT_PROVIDER_STATUS_CLIENT = createProviderStatusClient();

function errorMessageKey(error: unknown): MessageKey {
  if (error instanceof ProviderStatusClientError) {
    if (error.safeCode === "PROVIDER_TIMEOUT") return "errors.providerTimeout";
    if (error.safeCode === "PROVIDER_INVALID_RESPONSE") {
      return "errors.providerInvalid";
    }
  }
  return "errors.serverUnavailable";
}

function freshnessMessageKey(
  freshness: ProviderStatus["freshness"],
): MessageKey {
  switch (freshness) {
    case "current":
      return "freshness.current";
    case "stale":
      return "freshness.stale";
    case "unavailable":
      return "freshness.unavailable";
  }
}

export function ProviderStatusPanel({
  client = DEFAULT_PROVIDER_STATUS_CLIENT,
  initialStatuses = DEFAULT_CREDENTIAL_FREE_PROVIDER_STATUSES,
}: ProviderStatusPanelProps): ReactNode {
  const { text } = useLanguage();
  const [statuses, setStatuses] = useState<readonly Readonly<ProviderStatus>[]>(
    () => initialStatuses.map((status) => Object.freeze(parseProviderStatus(status))),
  );
  const [operationState, setOperationState] = useState<ClientOperationState>({
    status: "idle",
  });
  const requestSequence = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const sequence = ++requestSequence.current;
    const abortController = new AbortController();
    setOperationState({
      status: "loading",
      message: text("demoLabels.providerStatusLoading"),
    });

    try {
      const response = await client.load(abortController.signal);
      if (sequence !== requestSequence.current) return;
      setStatuses(response.providers);
      setOperationState({
        status: "ready",
        message: text("demoLabels.providerStatusUpdated"),
      });
    } catch (error: unknown) {
      if (sequence !== requestSequence.current) return;
      setOperationState({
        status: "failed",
        heading: text("demoLabels.providerStatusUnavailable"),
        message: text(errorMessageKey(error)),
        recovery: {
          kind: "retry",
          label: text("errors.retry"),
          onActivate: () => {
            void load();
          },
        },
      });
    }
  }, [client, text]);

  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  return (
    <section aria-labelledby="provider-status-heading" className="provider-status-panel">
      <h3 id="provider-status-heading">
        {text("demoLabels.providerStatus")}
      </h3>
      <ClientOperationStateView state={operationState}>
        <div className="provider-status-list">
          {statuses.map((status) => (
            <article
              className="provider-status-card"
              data-availability={status.availability}
              key={status.providerName}
            >
              <h4>{status.providerName}</h4>
              <dl>
                <div>
                  <dt>{text("demoLabels.providerMode")}</dt>
                  <dd>{status.providerMode}</dd>
                </div>
                <div>
                  <dt>{text("demoLabels.providerAvailability")}</dt>
                  <dd>
                    {text(
                      status.availability === "available"
                        ? "demoLabels.providerAvailable"
                        : "demoLabels.providerUnavailable",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{text("demoLabels.providerVerification")}</dt>
                  <dd>
                    {text(
                      status.verification === "verified"
                        ? "demoLabels.providerVerified"
                        : "demoLabels.providerUnverified",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{text("demoLabels.providerFreshness")}</dt>
                  <dd>{text(freshnessMessageKey(status.freshness))}</dd>
                </div>
                <div>
                  <dt>{text("demoLabels.fallbackProvider")}</dt>
                  <dd>{status.fallbackProvider}</dd>
                </div>
              </dl>
              {status.availability === "unavailable" ? (
                <p className="provider-fallback-notice">
                  {text("demoLabels.fallbackActive")}: {status.fallbackProvider}
                </p>
              ) : null}
              {status.nonSecretErrorCode === null ? null : (
                <p className="provider-error-code">
                  {text("demoLabels.providerErrorCode")}: {status.nonSecretErrorCode}
                </p>
              )}
            </article>
          ))}
        </div>
      </ClientOperationStateView>
    </section>
  );
}
