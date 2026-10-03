import {
  parseLocalState,
  type LocalState,
} from "@banjir-ready/contracts";

export const BANJIR_READY_STORAGE_PREFIX = "BanjirReady:";
export const LOCAL_STATE_SCHEMA_VERSION = 1 as const;
export const LOCAL_STATE_STORAGE_KEY =
  `${BANJIR_READY_STORAGE_PREFIX}local-state:v${LOCAL_STATE_SCHEMA_VERSION}`;
export const SHARED_BROWSER_NOTICE_ID = "notice.shared-browser";

export const STORAGE_NOTICE_KEYS = {
  clearConfirmation: "privacy.clearConfirm",
  invalidState: "errors.validation",
  persistenceUnavailable: "errors.storageUnavailable",
  sharedBrowser: "privacy.sharedDeviceNotice",
} as const;

export type StorageMode = "localStorage" | "memory";
export type StorageNoticeKey =
  (typeof STORAGE_NOTICE_KEYS)[keyof typeof STORAGE_NOTICE_KEYS];

export interface StorageBackend {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface StorageAdapterOptions {
  readonly initialState: LocalState;
  /** Omit this property to use window.localStorage. Pass null to force memory. */
  readonly storage?: StorageBackend | null;
}

export type StorageLoadResult = Readonly<
  | {
      status: "empty" | "loaded";
      state: LocalState;
      mode: "localStorage";
      noticeKey: null;
    }
  | {
      status: "persistence_unavailable";
      state: LocalState;
      mode: "memory";
      noticeKey: typeof STORAGE_NOTICE_KEYS.persistenceUnavailable;
    }
>;

export interface StorageSaveOptions {
  /**
   * Set only after presenting and receiving confirmation for the notice key
   * returned by a preceding `privacy_notice_required` result.
   */
  readonly sharedBrowserNoticeAcknowledged?: boolean;
}

export type StorageWriteResult = Readonly<
  | {
      status: "saved";
      state: LocalState;
      mode: "localStorage";
      noticeKey: null;
    }
  | {
      status: "privacy_notice_required";
      state: LocalState;
      mode: "localStorage";
      noticeKey: typeof STORAGE_NOTICE_KEYS.sharedBrowser;
    }
  | {
      status: "persistence_unavailable";
      state: LocalState;
      mode: "memory";
      noticeKey: typeof STORAGE_NOTICE_KEYS.persistenceUnavailable;
    }
  | {
      status: "invalid_state";
      state: LocalState;
      mode: StorageMode;
      noticeKey: typeof STORAGE_NOTICE_KEYS.invalidState;
    }
>;

export interface StorageClearOptions {
  /**
   * Accepted only after `clearAll` has returned `confirmation_required`, which
   * prevents a caller from bypassing the visible confirmation step.
   */
  readonly confirmed?: boolean;
}

export type StorageClearResult = Readonly<
  | {
      status: "confirmation_required";
      state: LocalState;
      mode: StorageMode;
      noticeKey: typeof STORAGE_NOTICE_KEYS.clearConfirmation;
    }
  | {
      status: "cleared";
      state: LocalState;
      mode: "localStorage";
      noticeKey: null;
    }
  | {
      status: "persistence_unavailable";
      state: LocalState;
      mode: "memory";
      noticeKey: typeof STORAGE_NOTICE_KEYS.persistenceUnavailable;
    }
>;

export interface StorageAdapter {
  load(): StorageLoadResult;
  save(next: unknown, options?: StorageSaveOptions): StorageWriteResult;
  clearAll(options?: StorageClearOptions): StorageClearResult;
  mode(): StorageMode;
}

const PROFILE_FIELDS = [
  "householdSize",
  "hasChildren",
  "hasElderlyMembers",
  "needsMobilityAssistance",
  "hasPets",
  "hasTransport",
] as const;

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Expected an object");
  }

  return input as Record<string, unknown>;
}

/**
 * Projects untrusted client state into the complete persistence allowlist before
 * validation. Extra application fields never reach serialization.
 */
export function projectLocalState(input: unknown): LocalState {
  const candidate = asRecord(input);
  const profileCandidate = asRecord(candidate.checklistProfile);
  const completionCandidate = asRecord(candidate.checklistCompletion);
  const checklistProfile = Object.fromEntries(
    PROFILE_FIELDS.map((field) => [field, profileCandidate[field]]),
  );

  return parseLocalState({
    schemaVersion: candidate.schemaVersion,
    language: candidate.language,
    checklistProfile,
    checklistRuleVersion: candidate.checklistRuleVersion,
    checklistCompletion: Object.fromEntries(
      Object.entries(completionCandidate),
    ),
    acknowledgedNotices: candidate.acknowledgedNotices,
  });
}

function copyState(state: LocalState): LocalState {
  return projectLocalState(state);
}

function resolveBrowserStorage(
  options: StorageAdapterOptions,
): StorageBackend | null {
  if (Object.prototype.hasOwnProperty.call(options, "storage")) {
    return options.storage ?? null;
  }

  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function addSharedBrowserAcknowledgement(state: LocalState): LocalState {
  if (state.acknowledgedNotices.includes(SHARED_BROWSER_NOTICE_ID)) {
    return state;
  }

  return parseLocalState({
    ...state,
    acknowledgedNotices: [
      ...state.acknowledgedNotices,
      SHARED_BROWSER_NOTICE_ID,
    ],
  });
}

/**
 * One-key, fail-closed browser persistence. Any unavailable, malformed, or
 * failed backend is abandoned for the rest of the adapter's lifetime so all
 * subsequent operations use the in-memory state consistently.
 */
export class PrivacyGatedStorageAdapter implements StorageAdapter {
  readonly #initialState: LocalState;
  #currentStorage: StorageBackend | null;
  #memoryState: LocalState;
  #privacyNoticePresented = false;
  #sharedBrowserNoticeAcknowledged = false;
  #clearConfirmationPresented = false;

  constructor(options: StorageAdapterOptions) {
    this.#initialState = projectLocalState(options.initialState);
    this.#memoryState = copyState(this.#initialState);
    this.#currentStorage = resolveBrowserStorage(options);
  }

  mode(): StorageMode {
    return this.#currentStorage === null ? "memory" : "localStorage";
  }

  load(): StorageLoadResult {
    if (this.#currentStorage === null) {
      return this.#unavailableLoadResult();
    }

    try {
      const serialized = this.#currentStorage.getItem(
        LOCAL_STATE_STORAGE_KEY,
      );
      if (serialized === null) {
        return {
          status: "empty",
          state: copyState(this.#memoryState),
          mode: "localStorage",
          noticeKey: null,
        };
      }

      const loaded = parseLocalState(JSON.parse(serialized) as unknown);
      this.#memoryState = loaded;
      this.#sharedBrowserNoticeAcknowledged =
        loaded.acknowledgedNotices.includes(SHARED_BROWSER_NOTICE_ID);

      return {
        status: "loaded",
        state: copyState(loaded),
        mode: "localStorage",
        noticeKey: null,
      };
    } catch {
      this.#degradeToMemory();
      return this.#unavailableLoadResult();
    }
  }

  save(next: unknown, options: StorageSaveOptions = {}): StorageWriteResult {
    let projected: LocalState;
    try {
      projected = projectLocalState(next);
    } catch {
      return {
        status: "invalid_state",
        state: copyState(this.#memoryState),
        mode: this.mode(),
        noticeKey: STORAGE_NOTICE_KEYS.invalidState,
      };
    }

    if (
      this.#currentStorage !== null &&
      !this.#sharedBrowserNoticeAcknowledged
    ) {
      const acknowledgementCompletesGate =
        this.#privacyNoticePresented &&
        options.sharedBrowserNoticeAcknowledged === true;

      if (!acknowledgementCompletesGate) {
        this.#privacyNoticePresented = true;
        return {
          status: "privacy_notice_required",
          state: copyState(this.#memoryState),
          mode: "localStorage",
          noticeKey: STORAGE_NOTICE_KEYS.sharedBrowser,
        };
      }

      projected = addSharedBrowserAcknowledgement(projected);
    } else if (this.#sharedBrowserNoticeAcknowledged) {
      projected = addSharedBrowserAcknowledgement(projected);
    }

    this.#memoryState = projected;
    this.#sharedBrowserNoticeAcknowledged =
      projected.acknowledgedNotices.includes(SHARED_BROWSER_NOTICE_ID);

    if (this.#currentStorage === null) {
      return this.#unavailableWriteResult();
    }

    try {
      this.#currentStorage.setItem(
        LOCAL_STATE_STORAGE_KEY,
        JSON.stringify(projected),
      );
      return {
        status: "saved",
        state: copyState(projected),
        mode: "localStorage",
        noticeKey: null,
      };
    } catch {
      this.#degradeToMemory();
      return this.#unavailableWriteResult();
    }
  }

  clearAll(options: StorageClearOptions = {}): StorageClearResult {
    const confirmationCompletesGate =
      this.#clearConfirmationPresented && options.confirmed === true;

    if (!confirmationCompletesGate) {
      this.#clearConfirmationPresented = true;
      return {
        status: "confirmation_required",
        state: copyState(this.#memoryState),
        mode: this.mode(),
        noticeKey: STORAGE_NOTICE_KEYS.clearConfirmation,
      };
    }

    this.#clearConfirmationPresented = false;
    this.#memoryState = copyState(this.#initialState);
    this.#privacyNoticePresented = false;
    this.#sharedBrowserNoticeAcknowledged = false;

    if (this.#currentStorage === null) {
      return this.#unavailableClearResult();
    }

    try {
      const keysToRemove: string[] = [];
      for (let index = 0; index < this.#currentStorage.length; index += 1) {
        const key = this.#currentStorage.key(index);
        if (key?.startsWith(BANJIR_READY_STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        this.#currentStorage.removeItem(key);
      }

      return {
        status: "cleared",
        state: copyState(this.#memoryState),
        mode: "localStorage",
        noticeKey: null,
      };
    } catch {
      this.#degradeToMemory();
      return this.#unavailableClearResult();
    }
  }

  #degradeToMemory(): void {
    this.#currentStorage = null;
  }

  #unavailableLoadResult(): StorageLoadResult {
    return {
      status: "persistence_unavailable",
      state: copyState(this.#memoryState),
      mode: "memory",
      noticeKey: STORAGE_NOTICE_KEYS.persistenceUnavailable,
    };
  }

  #unavailableWriteResult(): StorageWriteResult {
    return {
      status: "persistence_unavailable",
      state: copyState(this.#memoryState),
      mode: "memory",
      noticeKey: STORAGE_NOTICE_KEYS.persistenceUnavailable,
    };
  }

  #unavailableClearResult(): StorageClearResult {
    return {
      status: "persistence_unavailable",
      state: copyState(this.#memoryState),
      mode: "memory",
      noticeKey: STORAGE_NOTICE_KEYS.persistenceUnavailable,
    };
  }
}

export function createStorageAdapter(
  options: StorageAdapterOptions,
): StorageAdapter {
  return new PrivacyGatedStorageAdapter(options);
}
