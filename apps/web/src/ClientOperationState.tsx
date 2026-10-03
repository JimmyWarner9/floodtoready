import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

import { useLiveRegion } from "./liveRegion";

export type ClientOperationRecovery = Readonly<
  | {
      kind: "retry";
      label: string;
      onActivate: () => void;
    }
  | {
      kind: "safe-return";
      label: string;
      onActivate: () => void;
    }
>;

export type ClientOperationState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading"; message: string }>
  | Readonly<{ status: "ready"; message: string }>
  | Readonly<{
      status: "failed";
      heading: string;
      message: string;
      recovery: ClientOperationRecovery;
    }>;

export const IDLE_CLIENT_OPERATION_STATE: ClientOperationState = {
  status: "idle",
};

export interface ClientOperationStateProps {
  readonly children: ReactNode;
  readonly state: ClientOperationState;
}

export interface ClientOperationFailureProps {
  readonly heading: string;
  readonly message: string;
  readonly recovery: ClientOperationRecovery;
}

function usePoliteOperationAnnouncement(state: ClientOperationState): void {
  const { announcePolite } = useLiveRegion();
  const lastAnnouncementKey = useRef<string | null>(null);
  const message =
    state.status === "loading" || state.status === "ready"
      ? state.message
      : null;
  const announcementKey = `${state.status}:${message ?? ""}`;

  useEffect(() => {
    if (lastAnnouncementKey.current === announcementKey) {
      return;
    }

    lastAnnouncementKey.current = announcementKey;
    if (message !== null && message.length > 0) {
      announcePolite(message);
    }
  }, [announcePolite, announcementKey, message]);
}

/**
 * Renders one safe recovery action and announces the supplied safe, localized
 * error text through the shell's assertive live region.
 */
export function ClientOperationFailure({
  heading,
  message,
  recovery,
}: ClientOperationFailureProps): ReactNode {
  const { announceAssertive } = useLiveRegion();
  const headingId = useId();
  const messageId = useId();
  const announcement = `${heading} ${message}`;
  const lastAnnouncement = useRef<string | null>(null);

  useEffect(() => {
    if (lastAnnouncement.current === announcement) {
      return;
    }

    lastAnnouncement.current = announcement;
    announceAssertive(announcement);
  }, [announceAssertive, announcement]);

  return (
    <div
      aria-describedby={messageId}
      aria-labelledby={headingId}
      className="client-operation-error"
    >
      <h3 id={headingId}>{heading}</h3>
      <p id={messageId}>{message}</p>
      <button
        className="safe-action"
        data-recovery-kind={recovery.kind}
        onClick={recovery.onActivate}
        type="button"
      >
        {recovery.label}
      </button>
    </div>
  );
}

/**
 * Keeps previously rendered children mounted through loading and failure
 * transitions so in-memory and persisted values are not reset or cleared.
 */
export function ClientOperationStateView({
  children,
  state,
}: ClientOperationStateProps): ReactNode {
  usePoliteOperationAnnouncement(state);

  return (
    <div
      aria-busy={state.status === "loading"}
      className="client-operation-state"
      data-operation-state={state.status}
    >
      <div className="client-operation-content">{children}</div>

      {state.status === "loading" || state.status === "ready" ? (
        <p className="client-operation-notice">{state.message}</p>
      ) : null}

      {state.status === "failed" ? (
        <ClientOperationFailure
          heading={state.heading}
          message={state.message}
          recovery={state.recovery}
        />
      ) : null}
    </div>
  );
}
