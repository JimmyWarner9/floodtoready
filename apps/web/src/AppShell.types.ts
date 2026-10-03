import type { ReactNode } from "react";

import type { ClientOperationState } from "./ClientOperationState";
import type { MessageKey } from "./localization/resources";

export const PRIMARY_FEATURE_IDS = [
  "guidance",
  "checklist",
  "directory",
  "chat",
] as const;

export type PrimaryFeatureId = (typeof PRIMARY_FEATURE_IDS)[number];

export interface PrimaryFeatureDefinition {
  /** Static fallback used when AppShell is rendered without LanguageProvider. */
  label: string;
  /** Static fallback used when AppShell is rendered without LanguageProvider. */
  heading: string;
  labelKey?: MessageKey;
  headingKey?: MessageKey;
  content: ReactNode;
}

export type PrimaryFeatures = Readonly<
  Record<PrimaryFeatureId, PrimaryFeatureDefinition>
>;

export interface AppShellLabels {
  applicationName: string;
  tagline: string;
  skipToContent: string;
  demoMode: string;
  emergencyRegion: string;
  emergencyAction: string;
  emergencyDemoLabel: string;
  primaryNavigation: string;
  loading: string;
  featureOpened: string;
  featureErrorHeading: string;
  featureErrorBody: string;
  retry: string;
  safeReturn: string;
  footerText: string;
}

export const defaultAppShellLabels: AppShellLabels = {
  applicationName: "Banjir Ready",
  tagline: "Flood preparedness / Persediaan banjir",
  skipToContent: "Skip to main content / Langkau ke kandungan utama",
  demoMode: "Demo Mode / Mod Demo",
  emergencyRegion: "Emergency access / Akses kecemasan",
  emergencyAction: "Call 999 / Hubungi 999",
  emergencyDemoLabel:
    "Demo Data / Data Demo — contact validation is required before public deployment / pengesahan nombor diperlukan sebelum penggunaan awam",
  primaryNavigation: "Primary features / Ciri utama",
  loading: "Loading / Sedang dimuatkan",
  featureOpened: "opened / dibuka",
  featureErrorHeading: "This feature is unavailable / Ciri ini tidak tersedia",
  featureErrorBody:
    "BanjirReady kept emergency access available. No saved information was cleared / BanjirReady mengekalkan akses kecemasan. Tiada maklumat tersimpan dipadamkan.",
  retry: "Try again / Cuba lagi",
  safeReturn: "Return to guidance / Kembali ke panduan",
  footerText:
    "Preparedness information only; BanjirReady cannot dispatch or monitor rescue requests or guarantee current safety / Maklumat persediaan sahaja; BanjirReady tidak boleh menghantar atau memantau permintaan menyelamat atau menjamin keselamatan semasa.",
};

export interface AppShellProps {
  features: PrimaryFeatures;
  showDemoMode?: boolean;
  labels?: AppShellLabels;
  activeFeature?: PrimaryFeatureId;
  initialActiveFeature?: PrimaryFeatureId;
  isLoading?: boolean;
  operationState?: ClientOperationState;
  onFeatureChange?: (feature: PrimaryFeatureId) => void;
}


