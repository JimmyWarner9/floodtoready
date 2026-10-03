import type { ChecklistProfile, LocalState } from "@banjir-ready/contracts";

import type { Language } from "./localization/resources";

export interface LocalizedText {
  readonly en: string;
  readonly ms: string;
}

export function localize(text: LocalizedText, language: Language): string {
  return text[language];
}

export const LOCAL_STATE_TOP_LEVEL_FIELDS = [
  "schemaVersion",
  "language",
  "checklistProfile",
  "checklistRuleVersion",
  "checklistCompletion",
  "acknowledgedNotices",
] as const satisfies readonly (keyof LocalState)[];

export const CHECKLIST_PROFILE_FIELDS = [
  "householdSize",
  "hasChildren",
  "hasElderlyMembers",
  "needsMobilityAssistance",
  "hasPets",
  "hasTransport",
] as const satisfies readonly (keyof ChecklistProfile)[];

export const STORAGE_FIELD_DISCLOSURES = [
  {
    id: "language",
    label: { en: "Language preference", ms: "Keutamaan bahasa" },
  },
  {
    id: "householdSize",
    label: { en: "Household size", ms: "Saiz isi rumah" },
  },
  {
    id: "hasChildren",
    label: {
      en: "Whether children are in the household",
      ms: "Sama ada kanak-kanak berada dalam isi rumah",
    },
  },
  {
    id: "hasElderlyMembers",
    label: {
      en: "Whether elderly members are in the household",
      ms: "Sama ada warga emas berada dalam isi rumah",
    },
  },
  {
    id: "needsMobilityAssistance",
    label: {
      en: "Whether mobility assistance is needed",
      ms: "Sama ada bantuan pergerakan diperlukan",
    },
  },
  {
    id: "hasPets",
    label: {
      en: "Whether pets are in the household",
      ms: "Sama ada haiwan peliharaan berada dalam isi rumah",
    },
  },
  {
    id: "hasTransport",
    label: {
      en: "Whether transport is available",
      ms: "Sama ada pengangkutan tersedia",
    },
  },
  {
    id: "checklistRuleVersion",
    label: { en: "Checklist rule version", ms: "Versi peraturan senarai semak" },
  },
  {
    id: "checklistCompletion",
    label: {
      en: "Stable checklist item IDs and completion states",
      ms: "ID item senarai semak stabil dan keadaan penyelesaian",
    },
  },
  {
    id: "acknowledgedNotices",
    label: { en: "Acknowledged notices", ms: "Notis yang diperakui" },
  },
] as const;

export type OptionalIntegrationId =
  | "agency-live-feed"
  | "warning-live-feed"
  | "directory-live-sync"
  | "external-model"
  | "remote-retrieval";

export interface OptionalIntegrationDisclosure {
  readonly id: OptionalIntegrationId;
  readonly name: LocalizedText;
  readonly enabled: false;
  readonly availability: "unavailable";
  readonly verification: "unverified";
  readonly fallback: LocalizedText;
}

export const OPTIONAL_INTEGRATION_REGISTRY = [
  {
    id: "agency-live-feed",
    name: { en: "Live agency data feed", ms: "Suapan data agensi langsung" },
    enabled: false,
    availability: "unavailable",
    verification: "unverified",
    fallback: {
      en: "Versioned bundled demo records",
      ms: "Rekod demo terbina dalam yang berversi",
    },
  },
  {
    id: "warning-live-feed",
    name: { en: "Live official-warning feed", ms: "Suapan amaran rasmi langsung" },
    enabled: false,
    availability: "unavailable",
    verification: "unverified",
    fallback: {
      en: "Separately labelled deterministic demo channels",
      ms: "Saluran demo deterministik yang dilabel secara berasingan",
    },
  },
  {
    id: "directory-live-sync",
    name: { en: "Live agency-directory sync", ms: "Penyegerakan direktori agensi langsung" },
    enabled: false,
    availability: "unavailable",
    verification: "unverified",
    fallback: {
      en: "Bundled agency-directory fixture",
      ms: "Lekapan direktori agensi terbina dalam",
    },
  },
  {
    id: "external-model",
    name: { en: "External model synthesis", ms: "Sintesis model luaran" },
    enabled: false,
    availability: "unavailable",
    verification: "unverified",
    fallback: {
      en: "Deterministic local answer templates",
      ms: "Templat jawapan tempatan deterministik",
    },
  },
  {
    id: "remote-retrieval",
    name: {
      en: "Remote embeddings and reranking",
      ms: "Pembenaman dan penyusunan semula jauh",
    },
    enabled: false,
    availability: "unavailable",
    verification: "unverified",
    fallback: {
      en: "Deterministic local retrieval",
      ms: "Pengambilan tempatan deterministik",
    },
  },
] as const satisfies readonly OptionalIntegrationDisclosure[];

export const ENABLED_EXTERNAL_INTEGRATIONS = OPTIONAL_INTEGRATION_REGISTRY.filter(
  (integration) => integration.enabled,
);

export type OutOfScopeCapabilityId =
  | "accounts"
  | "payments"
  | "rescue"
  | "reports"
  | "routes"
  | "forecasts"
  | "location"
  | "professional-advice";

export interface OutOfScopeCapability {
  readonly id: OutOfScopeCapabilityId;
  readonly title: LocalizedText;
  readonly detail: LocalizedText;
}

export const OUT_OF_SCOPE_CAPABILITIES = [
  {
    id: "accounts",
    title: { en: "Accounts and identity", ms: "Akaun dan identiti" },
    detail: {
      en: "Accounts, authentication, sign-in, and cross-device profile synchronization are unavailable.",
      ms: "Akaun, pengesahan, log masuk dan penyegerakan profil merentas peranti tidak tersedia.",
    },
  },
  {
    id: "payments",
    title: { en: "Payments", ms: "Pembayaran" },
    detail: {
      en: "Payments, donations, subscriptions, and financial transactions are unavailable.",
      ms: "Pembayaran, derma, langganan dan transaksi kewangan tidak tersedia.",
    },
  },
  {
    id: "rescue",
    title: { en: "Rescue operations", ms: "Operasi menyelamat" },
    detail: {
      en: "Rescue requests, dispatch, incident command, rescue monitoring, and emergency-service case tracking are unavailable.",
      ms: "Permintaan menyelamat, penghantaran, arahan insiden, pemantauan penyelamatan dan penjejakan kes perkhidmatan kecemasan tidak tersedia.",
    },
  },
  {
    id: "reports",
    title: { en: "User reports and social features", ms: "Laporan pengguna dan ciri sosial" },
    detail: {
      en: "User-submitted reports, crowdsourcing, social feeds, and community moderation are unavailable.",
      ms: "Laporan pengguna, penyumberan ramai, suapan sosial dan penyederhanaan komuniti tidak tersedia.",
    },
  },
  {
    id: "routes",
    title: { en: "Routes and navigation", ms: "Laluan dan navigasi" },
    detail: {
      en: "Evacuation-route calculation, navigation, traffic-aware routing, and safe-route guarantees are unavailable.",
      ms: "Pengiraan laluan pemindahan, navigasi, laluan berdasarkan trafik dan jaminan laluan selamat tidak tersedia.",
    },
  },
  {
    id: "forecasts",
    title: { en: "Forecasts and safety claims", ms: "Ramalan dan dakwaan keselamatan" },
    detail: {
      en: "Flood forecasting, water-level prediction, and claims that a location is currently safe are unavailable.",
      ms: "Ramalan banjir, jangkaan paras air dan dakwaan bahawa sesuatu lokasi selamat pada masa ini tidak tersedia.",
    },
  },
  {
    id: "location",
    title: { en: "Location tracking and notifications", ms: "Penjejakan lokasi dan pemberitahuan" },
    detail: {
      en: "Background location tracking, precise-location storage, and push notifications are unavailable.",
      ms: "Penjejakan lokasi latar belakang, penyimpanan lokasi tepat dan pemberitahuan tolak tidak tersedia.",
    },
  },
  {
    id: "professional-advice",
    title: { en: "Professional advice", ms: "Nasihat profesional" },
    detail: {
      en: "Clinical, legal, engineering, and emergency-professional advice are unavailable.",
      ms: "Nasihat klinikal, undang-undang, kejuruteraan dan profesional kecemasan tidak tersedia.",
    },
  },
] as const satisfies readonly OutOfScopeCapability[];

export const STATUS_DEFINITIONS = [
  {
    id: "Demo_Guidance",
    title: { en: "Demo Guidance", ms: "Panduan Demo" },
    detail: {
      en: "Guidance without complete documented review metadata. It is not government endorsement.",
      ms: "Panduan tanpa metadata semakan berdokumen yang lengkap. Ia bukan pengendorsan kerajaan.",
    },
  },
  {
    id: "Reviewed_Guidance",
    title: { en: "Reviewed Guidance", ms: "Panduan Disemak" },
    detail: {
      en: "Guidance with a named reviewer, organization or qualification, review date, content version, and source. It is not government endorsement.",
      ms: "Panduan dengan nama penyemak, organisasi atau kelayakan, tarikh semakan, versi kandungan dan sumber. Ia bukan pengendorsan kerajaan.",
    },
  },
] as const;
