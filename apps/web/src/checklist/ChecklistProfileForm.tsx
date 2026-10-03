import { useState, type FormEvent, type ReactNode } from "react";

import {
  checklistProfileSchema,
  type ChecklistProfile,
} from "@banjir-ready/contracts";

import "./ChecklistProfileForm.css";

export const CHECKLIST_PROFILE_FIELD_NAMES = [
  "householdSize",
  "hasChildren",
  "hasElderlyMembers",
  "needsMobilityAssistance",
  "hasPets",
  "hasTransport",
] as const satisfies readonly (keyof ChecklistProfile)[];

export const EMPTY_CHECKLIST_PROFILE: ChecklistProfile = Object.freeze({
  householdSize: null,
  hasChildren: null,
  hasElderlyMembers: null,
  needsMobilityAssistance: null,
  hasPets: null,
  hasTransport: null,
});

type BooleanProfileField = Exclude<
  (typeof CHECKLIST_PROFILE_FIELD_NAMES)[number],
  "householdSize"
>;

type BooleanDraftValue = "" | "true" | "false";

interface ChecklistProfileDraft {
  householdSize: string;
  hasChildren: BooleanDraftValue;
  hasElderlyMembers: BooleanDraftValue;
  needsMobilityAssistance: BooleanDraftValue;
  hasPets: BooleanDraftValue;
  hasTransport: BooleanDraftValue;
}

export interface ChecklistProfileFormLabels {
  heading: string;
  instructions: string;
  optionalHint: string;
  householdSize: string;
  householdSizeInstruction: string;
  hasChildren: string;
  hasElderlyMembers: string;
  needsMobilityAssistance: string;
  hasPets: string;
  hasTransport: string;
  unselected: string;
  yes: string;
  no: string;
  submit: string;
  householdSizeError: string;
}

export const defaultChecklistProfileFormLabels: ChecklistProfileFormLabels = {
  heading: "Household details / Butiran isi rumah",
  instructions:
    "Choose only the details you want to use for this checklist. These draft values stay in this browser and are not sent to the server. / Pilih hanya butiran yang ingin digunakan untuk senarai semak ini. Nilai draf ini kekal dalam pelayar dan tidak dihantar ke pelayan.",
  optionalHint: "Optional / Pilihan",
  householdSize: "Household size / Saiz isi rumah",
  householdSizeInstruction:
    "Enter a whole number from 1 to 100, or leave blank. / Masukkan nombor bulat dari 1 hingga 100, atau biarkan kosong.",
  hasChildren: "Children in the household / Kanak-kanak dalam isi rumah",
  hasElderlyMembers:
    "Elderly members in the household / Warga emas dalam isi rumah",
  needsMobilityAssistance:
    "Mobility assistance needed / Bantuan pergerakan diperlukan",
  hasPets: "Pets in the household / Haiwan peliharaan dalam isi rumah",
  hasTransport: "Transport available / Pengangkutan tersedia",
  unselected: "Not selected / Tidak dipilih",
  yes: "Yes / Ya",
  no: "No / Tidak",
  submit: "Use household details / Gunakan butiran isi rumah",
  householdSizeError:
    "Enter a whole number from 1 to 100 or leave this field blank. / Masukkan nombor bulat dari 1 hingga 100 atau biarkan medan ini kosong.",
};

export interface ChecklistProfileFormProps {
  initialProfile?: ChecklistProfile;
  labels?: ChecklistProfileFormLabels;
  onSubmitProfile?: (profile: ChecklistProfile) => void;
}

function toBooleanDraft(value: boolean | null): BooleanDraftValue {
  if (value === null) {
    return "";
  }

  return value ? "true" : "false";
}

function createDraft(candidate?: ChecklistProfile): ChecklistProfileDraft {
  const parsed = checklistProfileSchema.safeParse(candidate);
  const profile = parsed.success ? parsed.data : EMPTY_CHECKLIST_PROFILE;

  return {
    householdSize:
      profile.householdSize === null ? "" : String(profile.householdSize),
    hasChildren: toBooleanDraft(profile.hasChildren),
    hasElderlyMembers: toBooleanDraft(profile.hasElderlyMembers),
    needsMobilityAssistance: toBooleanDraft(
      profile.needsMobilityAssistance,
    ),
    hasPets: toBooleanDraft(profile.hasPets),
    hasTransport: toBooleanDraft(profile.hasTransport),
  };
}

function fromBooleanDraft(value: BooleanDraftValue): boolean | null {
  if (value === "") {
    return null;
  }

  return value === "true";
}

function parseHouseholdSize(value: string): number | null | undefined {
  const normalized = value.trim();

  if (normalized === "") {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100
    ? parsed
    : undefined;
}

function createProfile(
  draft: ChecklistProfileDraft,
): ChecklistProfile | undefined {
  const householdSize = parseHouseholdSize(draft.householdSize);

  if (householdSize === undefined) {
    return undefined;
  }

  const candidate = {
    householdSize,
    hasChildren: fromBooleanDraft(draft.hasChildren),
    hasElderlyMembers: fromBooleanDraft(draft.hasElderlyMembers),
    needsMobilityAssistance: fromBooleanDraft(
      draft.needsMobilityAssistance,
    ),
    hasPets: fromBooleanDraft(draft.hasPets),
    hasTransport: fromBooleanDraft(draft.hasTransport),
  };
  const parsed = checklistProfileSchema.safeParse(candidate);

  return parsed.success ? parsed.data : undefined;
}

interface BooleanProfileControlProps {
  field: BooleanProfileField;
  label: string;
  labels: ChecklistProfileFormLabels;
  onChange: (field: BooleanProfileField, value: BooleanDraftValue) => void;
  value: BooleanDraftValue;
}

function BooleanProfileControl({
  field,
  label,
  labels,
  onChange,
  value,
}: BooleanProfileControlProps): ReactNode {
  const hintId = `checklist-profile-${field}-hint`;

  return (
    <div className="checklist-profile-field">
      <label htmlFor={`checklist-profile-${field}`}>
        {label} <span className="checklist-optional">({labels.optionalHint})</span>
      </label>
      <p className="checklist-field-hint" id={hintId}>
        {labels.unselected} = {labels.optionalHint}
      </p>
      <select
        aria-describedby={hintId}
        id={`checklist-profile-${field}`}
        name={field}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          if (
            nextValue === "" ||
            nextValue === "true" ||
            nextValue === "false"
          ) {
            onChange(field, nextValue);
          }
        }}
        value={value}
      >
        <option value="">{labels.unselected}</option>
        <option value="true">{labels.yes}</option>
        <option value="false">{labels.no}</option>
      </select>
    </div>
  );
}

export function ChecklistProfileForm({
  initialProfile,
  labels = defaultChecklistProfileFormLabels,
  onSubmitProfile,
}: ChecklistProfileFormProps): ReactNode {
  const [draft, setDraft] = useState<ChecklistProfileDraft>(() =>
    createDraft(initialProfile),
  );
  const [householdSizeError, setHouseholdSizeError] = useState(false);

  const validateHouseholdSize = (value: string): boolean => {
    const isValid = parseHouseholdSize(value) !== undefined;
    setHouseholdSizeError(!isValid);
    return isValid;
  };

  const updateBooleanField = (
    field: BooleanProfileField,
    value: BooleanDraftValue,
  ): void => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!validateHouseholdSize(draft.householdSize)) {
      document.getElementById("checklist-profile-householdSize")?.focus();
      return;
    }

    const profile = createProfile(draft);
    if (profile === undefined) {
      setHouseholdSizeError(true);
      document.getElementById("checklist-profile-householdSize")?.focus();
      return;
    }

    onSubmitProfile?.(profile);
  };

  const booleanControls: readonly {
    field: BooleanProfileField;
    label: string;
  }[] = [
    { field: "hasChildren", label: labels.hasChildren },
    { field: "hasElderlyMembers", label: labels.hasElderlyMembers },
    {
      field: "needsMobilityAssistance",
      label: labels.needsMobilityAssistance,
    },
    { field: "hasPets", label: labels.hasPets },
    { field: "hasTransport", label: labels.hasTransport },
  ];

  const householdDescriptionIds = householdSizeError
    ? "checklist-profile-householdSize-hint checklist-profile-householdSize-error"
    : "checklist-profile-householdSize-hint";

  return (
    <section
      aria-labelledby="checklist-profile-heading"
      className="checklist-profile"
    >
      <h3 id="checklist-profile-heading">{labels.heading}</h3>
      <p id="checklist-profile-instructions">{labels.instructions}</p>

      <form
        aria-describedby="checklist-profile-instructions"
        noValidate
        onSubmit={submitProfile}
      >
        <div className="checklist-profile-field">
          <label htmlFor="checklist-profile-householdSize">
            {labels.householdSize}{" "}
            <span className="checklist-optional">({labels.optionalHint})</span>
          </label>
          <p
            className="checklist-field-hint"
            id="checklist-profile-householdSize-hint"
          >
            {labels.householdSizeInstruction}
          </p>
          <input
            aria-describedby={householdDescriptionIds}
            aria-invalid={householdSizeError || undefined}
            id="checklist-profile-householdSize"
            inputMode="numeric"
            max={100}
            min={1}
            name="householdSize"
            onBlur={(event) => {
              validateHouseholdSize(event.currentTarget.value);
            }}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({
                ...current,
                householdSize: value,
              }));

              if (householdSizeError) {
                validateHouseholdSize(value);
              }
            }}
            step={1}
            type="number"
            value={draft.householdSize}
          />
          {householdSizeError ? (
            <p
              className="checklist-field-error"
              id="checklist-profile-householdSize-error"
              role="alert"
            >
              {labels.householdSizeError}
            </p>
          ) : null}
        </div>

        {booleanControls.map(({ field, label }) => (
          <BooleanProfileControl
            field={field}
            key={field}
            label={label}
            labels={labels}
            onChange={updateBooleanField}
            value={draft[field]}
          />
        ))}

        <button className="checklist-profile-submit" type="submit">
          {labels.submit}
        </button>
      </form>
    </section>
  );
}
