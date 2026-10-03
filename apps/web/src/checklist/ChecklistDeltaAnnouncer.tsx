import { useEffect, useRef, type ReactNode } from "react";

import {
  checklistDeltaSchema,
  type ChecklistDelta,
} from "@banjir-ready/contracts";

import { useLiveRegion } from "../liveRegion";
import { useOptionalLanguage } from "../localization/LanguageProvider";

const DEFAULT_ANNOUNCEMENT =
  "Checklist updated: {added} added, {retained} retained, {removed} removed. / Senarai semak dikemas kini: {added} ditambah, {retained} dikekalkan, {removed} dibuang.";

export interface ChecklistDeltaAnnouncerProps {
  readonly delta: ChecklistDelta;
}

function interpolateCounts(
  template: string,
  delta: ChecklistDelta,
): string {
  return template.replace(
    /\{(added|retained|removed)\}/g,
    (_token, group: keyof ChecklistDelta) => String(delta[group].length),
  );
}

/**
 * Announces a validated checklist reconciliation through the shell's shared
 * polite live region. Identifier changes are part of the de-duplication key so
 * different reconciliations with equal counts are still announced.
 */
export function ChecklistDeltaAnnouncer({
  delta,
}: ChecklistDeltaAnnouncerProps): ReactNode {
  const { announcePolite } = useLiveRegion();
  const languageService = useOptionalLanguage();
  const lastAnnouncementKey = useRef<string | null>(null);
  const parsed = checklistDeltaSchema.safeParse(delta);
  const validDelta = parsed.success ? parsed.data : null;
  const announcementKey =
    validDelta === null
      ? null
      : JSON.stringify([
          languageService?.language ?? "bilingual",
          validDelta.added,
          validDelta.retained,
          validDelta.removed,
        ]);
  const announcement =
    validDelta === null
      ? null
      : languageService?.text("checklist.changesAnnouncement", {
          added: validDelta.added.length,
          retained: validDelta.retained.length,
          removed: validDelta.removed.length,
        }) ?? interpolateCounts(DEFAULT_ANNOUNCEMENT, validDelta);

  useEffect(() => {
    if (
      announcementKey === null ||
      announcement === null ||
      lastAnnouncementKey.current === announcementKey
    ) {
      return;
    }

    lastAnnouncementKey.current = announcementKey;
    announcePolite(announcement);
  }, [announcePolite, announcement, announcementKey]);

  return null;
}
