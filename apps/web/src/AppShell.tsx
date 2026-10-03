import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  PRIMARY_FEATURE_IDS,
  defaultAppShellLabels,
  type AppShellProps,
  type PrimaryFeatureDefinition,
  type PrimaryFeatureId,
} from "./AppShell.types";
import {
  ClientOperationFailure,
  ClientOperationStateView,
  IDLE_CLIENT_OPERATION_STATE,
} from "./ClientOperationState";
import { LiveRegionContext, type LiveRegionApi } from "./liveRegion";
import {
  LanguageSelector,
  useOptionalLanguage,
  type LanguageService,
} from "./localization/LanguageProvider";

const EMPTY_ANNOUNCEMENT = { sequence: 0, message: "" } as const;

interface Announcement {
  sequence: number;
  message: string;
}

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode;
}

interface FeatureErrorBoundaryState {
  failed: boolean;
}

function resolveFeatureLabel(
  feature: PrimaryFeatureDefinition,
  languageService: LanguageService | null,
): string {
  return languageService !== null && feature.labelKey !== undefined
    ? languageService.text(feature.labelKey)
    : feature.label;
}

function resolveFeatureHeading(
  feature: PrimaryFeatureDefinition,
  languageService: LanguageService | null,
): string {
  return languageService !== null && feature.headingKey !== undefined
    ? languageService.text(feature.headingKey)
    : feature.heading;
}

/** Isolates a feature failure without catching the persistent emergency controls. */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  public override state: FeatureErrorBoundaryState = { failed: false };

  public static getDerivedStateFromError(): FeatureErrorBoundaryState {
    return { failed: true };
  }

  public override componentDidCatch(): void {
    // Raw errors are deliberately not logged or rendered at this browser boundary.
  }

  private readonly reset = (): void => {
    this.setState({ failed: false });
  };

  public override render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback(this.reset);
    }

    return this.props.children;
  }
}

export function AppShell({
  features,
  showDemoMode = true,
  labels = defaultAppShellLabels,
  activeFeature: controlledActiveFeature,
  initialActiveFeature = "guidance",
  isLoading = false,
  operationState = IDLE_CLIENT_OPERATION_STATE,
  onFeatureChange,
}: AppShellProps): ReactNode {
  const languageService = useOptionalLanguage();
  const localizedLabels =
    languageService === null
      ? labels
      : {
          ...labels,
          applicationName: languageService.text("navigation.appName"),
          tagline: languageService.text("guidance.description"),
          skipToContent: languageService.text("navigation.skipToContent"),
          demoMode: languageService.text("demoLabels.demoMode"),
          emergencyRegion: languageService.text("navigation.emergencyAction"),
          emergencyAction: languageService.text("chat.callEmergency"),
          emergencyDemoLabel: languageService.language === 'ms' ? 'Membuka pendail telefon. Aplikasi tidak menghantar penyelamat.' : 'Opens your phone dialler. The app does not dispatch rescue.',
          featureErrorHeading: languageService.text("errors.unexpected"),
          featureErrorBody: languageService.text("errors.serverUnavailable"),
          retry: languageService.text("errors.retry"),
          safeReturn: languageService.text("errors.safeReturn"),
          footerText: `${languageService.text("limitations.informationOnly")} ${languageService.text("limitations.noRescueDispatch")} ${languageService.text("limitations.noSafetyGuarantee")}`,
        };
  const [internalActiveFeature, setInternalActiveFeature] =
    useState<PrimaryFeatureId>(initialActiveFeature);
  const activeFeature = controlledActiveFeature ?? internalActiveFeature;
  const [mountedFeatures, setMountedFeatures] = useState<
    ReadonlySet<PrimaryFeatureId>
  >(() => new Set([activeFeature]));
  const [politeAnnouncement, setPoliteAnnouncement] =
    useState<Announcement>(EMPTY_ANNOUNCEMENT);
  const [assertiveAnnouncement, setAssertiveAnnouncement] =
    useState<Announcement>(EMPTY_ANNOUNCEMENT);
  const shouldFocusFeature = useRef(false);

  const announcePolite = useCallback((message: string): void => {
    setPoliteAnnouncement((current) => ({
      sequence: current.sequence + 1,
      message,
    }));
  }, []);

  const announceAssertive = useCallback((message: string): void => {
    setAssertiveAnnouncement((current) => ({
      sequence: current.sequence + 1,
      message,
    }));
  }, []);

  useEffect(() => {
    setMountedFeatures((current) => {
      if (current.has(activeFeature)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeFeature);
      return next;
    });

    if (shouldFocusFeature.current) {
      document.getElementById(`feature-heading-${activeFeature}`)?.focus();
      shouldFocusFeature.current = false;
    }
  }, [activeFeature]);

  const selectFeature = useCallback(
    (nextFeature: PrimaryFeatureId): void => {
      setMountedFeatures((current) => new Set(current).add(nextFeature));
      shouldFocusFeature.current = true;

      if (controlledActiveFeature === undefined) {
        setInternalActiveFeature(nextFeature);
      }

      onFeatureChange?.(nextFeature);
      announcePolite(
        `${resolveFeatureLabel(features[nextFeature], languageService)} ${localizedLabels.featureOpened}`,
      );
    },
    [
      announcePolite,
      controlledActiveFeature,
      features,
      languageService,
      localizedLabels.featureOpened,
      onFeatureChange,
    ],
  );

  const liveRegionApi: LiveRegionApi = {
    announcePolite,
    announceAssertive,
  };

  return (
    <LiveRegionContext.Provider value={liveRegionApi}>
      <a className="skip-link" href="#main-content">
        {localizedLabels.skipToContent}
      </a>

      <div className="app-shell">
        <header className="site-header">
          <div className="brand-row">
            <div className="brand-copy">
              <h1>{localizedLabels.applicationName}</h1>
              <p>{localizedLabels.tagline}</p>
            </div>
            {showDemoMode && <p className="demo-mode" role="status">
              {localizedLabels.demoMode}
            </p>}
          </div>

          {languageService === null ? null : <LanguageSelector />}

          <aside
            aria-label={localizedLabels.emergencyRegion}
            className="emergency-access"
          >
            <strong>{localizedLabels.emergencyRegion}</strong>
            <a className="emergency-action" href="tel:999">
              {localizedLabels.emergencyAction}
            </a>
            <small>{localizedLabels.emergencyDemoLabel}</small>
          </aside>

          <nav
            aria-label={localizedLabels.primaryNavigation}
            className="primary-nav"
          >
            {PRIMARY_FEATURE_IDS.map((featureId) => (
              <button
                aria-current={
                  featureId === activeFeature ? "page" : undefined
                }
                className="primary-nav-action"
                key={featureId}
                onClick={() => {
                  selectFeature(featureId);
                }}
                type="button"
              >
                {resolveFeatureLabel(features[featureId], languageService)}
              </button>
            ))}
          </nav>
        </header>

        <main
          aria-busy={isLoading || operationState.status === "loading"}
          id="main-content"
          tabIndex={-1}
        >
          <ClientOperationStateView state={operationState}>
            {isLoading ? (
              <p className="loading-status" role="status">
                {localizedLabels.loading}
              </p>
            ) : null}

            {PRIMARY_FEATURE_IDS.map((featureId) => {
              const feature = features[featureId];
              const isActive = featureId === activeFeature;
              const shouldRender = mountedFeatures.has(featureId) || isActive;

              if (!shouldRender) {
                return null;
              }

              return (
                <section
                  aria-labelledby={`feature-heading-${featureId}`}
                  className="feature-panel"
                  hidden={!isActive}
                  key={featureId}
                >
                  <h2 id={`feature-heading-${featureId}`} tabIndex={-1}>
                    {resolveFeatureHeading(feature, languageService)}
                  </h2>
                  <FeatureErrorBoundary
                    fallback={(reset) => (
                      <ClientOperationFailure
                        heading={localizedLabels.featureErrorHeading}
                        message={localizedLabels.featureErrorBody}
                        recovery={{
                          kind:
                            featureId === "guidance" ? "retry" : "safe-return",
                          label:
                            featureId === "guidance"
                              ? localizedLabels.retry
                              : localizedLabels.safeReturn,
                          onActivate: () => {
                            reset();
                            if (featureId !== "guidance") {
                              selectFeature("guidance");
                            }
                          },
                        }}
                      />
                    )}
                  >
                    {feature.content}
                  </FeatureErrorBoundary>
                </section>
              );
            })}
          </ClientOperationStateView>
        </main>

        <footer className="site-footer">
          <p>{localizedLabels.footerText}</p>
        </footer>
      </div>

      <div
        aria-atomic="true"
        aria-live="polite"
        className="visually-hidden"
        data-sequence={politeAnnouncement.sequence}
      >
        {politeAnnouncement.message}
      </div>
      <div
        aria-atomic="true"
        aria-live="assertive"
        className="visually-hidden"
        data-sequence={assertiveAnnouncement.sequence}
      >
        {assertiveAnnouncement.message}
      </div>
    </LiveRegionContext.Provider>
  );
}


