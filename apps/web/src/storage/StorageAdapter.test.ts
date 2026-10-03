import type { LocalState } from "@banjir-ready/contracts";
import { CHECKLIST_RULE_VERSION } from "@banjir-ready/fixtures";
import { describe, expect, it } from "vitest";

import {
  BANJIR_READY_STORAGE_PREFIX,
  LOCAL_STATE_STORAGE_KEY,
  PrivacyGatedStorageAdapter,
  SHARED_BROWSER_NOTICE_ID,
  STORAGE_NOTICE_KEYS,
  type StorageBackend,
} from "./StorageAdapter";

const DEFAULT_STATE: LocalState = {
  schemaVersion: 1,
  language: "en",
  checklistProfile: {
    householdSize: null,
    hasChildren: null,
    hasElderlyMembers: null,
    needsMobilityAssistance: null,
    hasPets: null,
    hasTransport: null,
  },
  checklistRuleVersion: CHECKLIST_RULE_VERSION,
  checklistCompletion: {},
  acknowledgedNotices: [],
};

const SAVED_STATE: LocalState = {
  schemaVersion: 1,
  language: "ms",
  checklistProfile: {
    householdSize: 5,
    hasChildren: true,
    hasElderlyMembers: false,
    needsMobilityAssistance: true,
    hasPets: true,
    hasTransport: false,
  },
  checklistRuleVersion: CHECKLIST_RULE_VERSION,
  checklistCompletion: {
    "checklist-item.drinking-water": true,
    "checklist-item.important-documents": false,
  },
  acknowledgedNotices: [],
};

class MemoryStorage implements StorageBackend {
  readonly values = new Map<string, string>();
  writeCount = 0;

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.writeCount += 1;
    this.values.set(key, value);
  }
}

function acknowledgeAndSave(
  adapter: PrivacyGatedStorageAdapter,
  state: unknown = SAVED_STATE,
) {
  expect(adapter.save(state)).toMatchObject({
    status: "privacy_notice_required",
    noticeKey: STORAGE_NOTICE_KEYS.sharedBrowser,
  });
  return adapter.save(state, { sharedBrowserNoticeAcknowledged: true });
}

describe("PrivacyGatedStorageAdapter", () => {
  it("shows the shared-browser notice before the first persistent write", () => {
    const storage = new MemoryStorage();
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });

    const bypassAttempt = adapter.save(SAVED_STATE, {
      sharedBrowserNoticeAcknowledged: true,
    });
    expect(bypassAttempt).toMatchObject({
      status: "privacy_notice_required",
      mode: "localStorage",
      noticeKey: "privacy.sharedDeviceNotice",
    });
    expect(storage.writeCount).toBe(0);

    const saved = adapter.save(SAVED_STATE, {
      sharedBrowserNoticeAcknowledged: true,
    });
    expect(saved).toMatchObject({ status: "saved", mode: "localStorage" });
    expect(saved.state.acknowledgedNotices).toContain(
      SHARED_BROWSER_NOTICE_ID,
    );
    expect(storage.writeCount).toBe(1);
  });

  it("serializes one versioned namespaced envelope containing only allowlisted fields", () => {
    const storage = new MemoryStorage();
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });
    const adversarialState = {
      ...SAVED_STATE,
      chatbotText: "sentinel-private-chat",
      name: "sentinel-name",
      diagnosis: "sentinel-diagnosis",
      exactAddress: "sentinel-address",
      medicationProfile: "sentinel-medication",
      credentials: "sentinel-credential",
      authorization: "sentinel-authorization",
      providerResponseBody: "sentinel-provider-body",
      printSnapshot: "sentinel-print",
      checklistProfile: {
        ...SAVED_STATE.checklistProfile,
        exactAddress: "sentinel-nested-address",
        diagnosis: "sentinel-nested-diagnosis",
      },
    };

    expect(acknowledgeAndSave(adapter, adversarialState).status).toBe(
      "saved",
    );
    expect([...storage.values.keys()]).toEqual([LOCAL_STATE_STORAGE_KEY]);

    const serialized = storage.values.get(LOCAL_STATE_STORAGE_KEY);
    expect(serialized).toBeDefined();
    expect(serialized).not.toContain("sentinel");

    const envelope = JSON.parse(serialized ?? "null") as Record<
      string,
      unknown
    >;
    expect(Object.keys(envelope)).toEqual([
      "schemaVersion",
      "language",
      "checklistProfile",
      "checklistRuleVersion",
      "checklistCompletion",
      "acknowledgedNotices",
    ]);
    expect(Object.keys(envelope.checklistProfile as object)).toEqual([
      "householdSize",
      "hasChildren",
      "hasElderlyMembers",
      "needsMobilityAssistance",
      "hasPets",
      "hasTransport",
    ]);
    expect(envelope).toEqual({
      ...SAVED_STATE,
      acknowledgedNotices: [SHARED_BROWSER_NOTICE_ID],
    });
  });

  it("restores the supported profile and completion state after reload without repeating the privacy gate", () => {
    const storage = new MemoryStorage();
    const firstAdapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });
    expect(acknowledgeAndSave(firstAdapter).status).toBe("saved");

    const reloadedAdapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });
    expect(reloadedAdapter.load()).toEqual({
      status: "loaded",
      state: {
        ...SAVED_STATE,
        acknowledgedNotices: [SHARED_BROWSER_NOTICE_ID],
      },
      mode: "localStorage",
      noticeKey: null,
    });

    const changed = {
      ...SAVED_STATE,
      language: "en" as const,
      acknowledgedNotices: [],
    };
    const result = reloadedAdapter.save(changed);
    expect(result.status).toBe("saved");
    expect(result.state.acknowledgedNotices).toEqual([
      SHARED_BROWSER_NOTICE_ID,
    ]);
    expect(storage.writeCount).toBe(2);
  });

  it("requires confirmation, removes every namespaced key, preserves unrelated keys, and restores defaults", () => {
    const storage = new MemoryStorage();
    storage.values.set("unrelated:preference", "keep");
    storage.values.set("BanjirReadyLegacy", "keep-without-prefix-colon");
    storage.values.set("banjirready:lowercase", "keep-case-sensitive");
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });
    expect(acknowledgeAndSave(adapter).status).toBe("saved");
    storage.values.set(`${BANJIR_READY_STORAGE_PREFIX}legacy:v0`, "remove");
    storage.values.set(`${BANJIR_READY_STORAGE_PREFIX}temporary`, "remove");

    expect(adapter.clearAll({ confirmed: true })).toMatchObject({
      status: "confirmation_required",
      state: {
        language: "ms",
        checklistCompletion: SAVED_STATE.checklistCompletion,
      },
      noticeKey: STORAGE_NOTICE_KEYS.clearConfirmation,
    });
    expect(storage.values.has(LOCAL_STATE_STORAGE_KEY)).toBe(true);

    expect(adapter.clearAll({ confirmed: true })).toEqual({
      status: "cleared",
      state: DEFAULT_STATE,
      mode: "localStorage",
      noticeKey: null,
    });
    expect([...storage.values.entries()]).toEqual([
      ["unrelated:preference", "keep"],
      ["BanjirReadyLegacy", "keep-without-prefix-colon"],
      ["banjirready:lowercase", "keep-case-sensitive"],
    ]);
    expect(adapter.load()).toEqual({
      status: "empty",
      state: DEFAULT_STATE,
      mode: "localStorage",
      noticeKey: null,
    });
    expect(adapter.save(SAVED_STATE).status).toBe(
      "privacy_notice_required",
    );
  });

  it("falls back to in-memory state and returns the localized notice when access fails", () => {
    const deniedStorage: StorageBackend = {
      length: 0,
      getItem() {
        throw new DOMException("denied", "SecurityError");
      },
      key: () => null,
      removeItem: () => undefined,
      setItem() {
        throw new Error("must not be reached after access failure");
      },
    };
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage: deniedStorage,
    });

    expect(adapter.load()).toEqual({
      status: "persistence_unavailable",
      state: DEFAULT_STATE,
      mode: "memory",
      noticeKey: "errors.storageUnavailable",
    });
    const saveResult = adapter.save(SAVED_STATE);
    expect(saveResult).toEqual({
      status: "persistence_unavailable",
      state: SAVED_STATE,
      mode: "memory",
      noticeKey: "errors.storageUnavailable",
    });
    expect(adapter.load().state).toEqual(SAVED_STATE);
  });

  it("keeps the completed save in memory when the persistent write fails", () => {
    let attemptedWrites = 0;
    const fullStorage: StorageBackend = {
      length: 0,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => {
        attemptedWrites += 1;
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage: fullStorage,
    });

    const result = acknowledgeAndSave(adapter);
    expect(result).toMatchObject({
      status: "persistence_unavailable",
      mode: "memory",
      noticeKey: STORAGE_NOTICE_KEYS.persistenceUnavailable,
      state: {
        checklistCompletion: SAVED_STATE.checklistCompletion,
        acknowledgedNotices: [SHARED_BROWSER_NOTICE_ID],
      },
    });
    expect(attemptedWrites).toBe(1);
    expect(adapter.mode()).toBe("memory");
    expect(adapter.load().state).toEqual(result.state);
  });

  it("restores unsaved defaults in memory when persistent clearing is unavailable", () => {
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage: null,
    });
    expect(adapter.save(SAVED_STATE).state).toEqual(SAVED_STATE);

    expect(adapter.clearAll()).toMatchObject({
      status: "confirmation_required",
      state: SAVED_STATE,
    });
    expect(adapter.clearAll({ confirmed: true })).toEqual({
      status: "persistence_unavailable",
      state: DEFAULT_STATE,
      mode: "memory",
      noticeKey: STORAGE_NOTICE_KEYS.persistenceUnavailable,
    });
  });

  it("fails closed to memory on malformed stored data", () => {
    const storage = new MemoryStorage();
    storage.values.set(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({ ...SAVED_STATE, chatbotText: "not-allowed" }),
    );
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });

    expect(adapter.load()).toEqual({
      status: "persistence_unavailable",
      state: DEFAULT_STATE,
      mode: "memory",
      noticeKey: STORAGE_NOTICE_KEYS.persistenceUnavailable,
    });
  });

  it("rejects invalid allowed values without partial memory or persistent writes", () => {
    const storage = new MemoryStorage();
    const adapter = new PrivacyGatedStorageAdapter({
      initialState: DEFAULT_STATE,
      storage,
    });
    const invalidState = {
      ...SAVED_STATE,
      checklistCompletion: { "checklist-item.drinking-water": "yes" },
    };

    expect(adapter.save(invalidState)).toEqual({
      status: "invalid_state",
      state: DEFAULT_STATE,
      mode: "localStorage",
      noticeKey: STORAGE_NOTICE_KEYS.invalidState,
    });
    expect(storage.writeCount).toBe(0);
    expect(adapter.load().state).toEqual(DEFAULT_STATE);
  });
});
