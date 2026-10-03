import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  RESOURCE_CATALOGS,
  SUPPORTED_LANGUAGES,
  resolveMessage,
  type Language,
  type MessageCatalogLookup,
  type MessageKey,
} from "./resources";

export interface LanguageService {
  readonly language: Language;
  readonly setLanguage: (language: Language) => void;
  readonly text: (
    key: MessageKey | string,
    variables?: Readonly<Record<string, string | number>>,
  ) => string;
}

export interface LanguageProviderProps {
  readonly children: ReactNode;
  readonly initialLanguage?: Language;
  readonly catalogs?: MessageCatalogLookup;
}

export interface LanguageLinkedRecord {
  readonly recordId: string;
  readonly language: Language;
  readonly equivalentRecordId?: string;
}

export interface LinkedLanguageSelection<T extends LanguageLinkedRecord> {
  readonly conceptualRecordId: string;
  readonly record: T;
}

const LanguageContext = createContext<LanguageService | null>(null);

export function isSupportedLanguage(value: string): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}

function interpolateMessage(
  template: string,
  variables: Readonly<Record<string, string | number>> | undefined,
): string {
  if (variables === undefined) {
    return template;
  }

  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, name: string) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : token,
  );
}

export function LanguageProvider({
  children,
  initialLanguage = "ms",
  catalogs = RESOURCE_CATALOGS,
}: LanguageProviderProps): ReactNode {
  const [language, setSelectedLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    const documentElement = document.documentElement;
    const previousLanguage = documentElement.lang;
    documentElement.lang = language;

    return () => {
      if (documentElement.lang === language) {
        documentElement.lang = previousLanguage;
      }
    };
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language): void => {
    if (isSupportedLanguage(nextLanguage)) {
      setSelectedLanguage(nextLanguage);
    }
  }, []);

  const text = useCallback(
    (
      key: MessageKey | string,
      variables?: Readonly<Record<string, string | number>>,
    ): string =>
      interpolateMessage(resolveMessage(language, key, catalogs), variables),
    [catalogs, language],
  );

  const service = useMemo<LanguageService>(
    () => ({ language, setLanguage, text }),
    [language, setLanguage, text],
  );

  return (
    <LanguageContext.Provider value={service}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageService {
  const service = useContext(LanguageContext);

  if (service === null) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return service;
}

export function useOptionalLanguage(): LanguageService | null {
  return useContext(LanguageContext);
}

export function LanguageSelector(): ReactNode {
  const { language, setLanguage, text } = useLanguage();

  return (
    <label className="language-selector">
      <span>{text("navigation.languageLabel")}</span>
      <select
        onChange={(event) => {
          const nextLanguage = event.currentTarget.value;
          if (isSupportedLanguage(nextLanguage)) {
            setLanguage(nextLanguage);
          }
        }}
        value={language}
      >
        <option value="ms">{text("navigation.languageMalay")}</option>
        <option value="en">{text("navigation.languageEnglish")}</option>
      </select>
    </label>
  );
}

/**
 * Selects exactly one localized record for a conceptual identity. Missing or
 * ambiguous selected-language content fails closed rather than cross-falling
 * back to another language.
 */
export function selectLinkedLanguageRecord<T extends LanguageLinkedRecord>(
  records: readonly T[],
  conceptualRecordId: string,
  language: Language,
  getConceptualRecordId: (record: T) => string = (record) =>
    record.equivalentRecordId ?? record.recordId,
): LinkedLanguageSelection<T> | null {
  const matches = records.filter(
    (record) =>
      record.language === language &&
      getConceptualRecordId(record) === conceptualRecordId,
  );

  const [record] = matches;

  if (matches.length !== 1 || record === undefined) {
    return null;
  }

  return {
    conceptualRecordId,
    record,
  };
}

export function useLinkedLanguageRecord<T extends LanguageLinkedRecord>(
  records: readonly T[],
  conceptualRecordId: string,
  getConceptualRecordId?: (record: T) => string,
): LinkedLanguageSelection<T> | null {
  const { language } = useLanguage();

  return useMemo(
    () =>
      selectLinkedLanguageRecord(
        records,
        conceptualRecordId,
        language,
        getConceptualRecordId,
      ),
    [conceptualRecordId, getConceptualRecordId, language, records],
  );
}
