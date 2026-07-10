import type { VisitStatus } from "../types/visit";
import type { TranslationKey } from "../i18n/translations";

export const VISIT_STATUS_LABEL_KEYS: Record<VisitStatus, TranslationKey> = {
  InProgress: "status.visit.inProgress",
  Completed: "status.visit.completed",
};

export const VISIT_STATUS_VARIANTS: Record<VisitStatus, "success" | "warning" | "danger" | "neutral"> = {
  InProgress: "warning",
  Completed: "success",
};

export const ALL_VISIT_STATUSES: VisitStatus[] = ["InProgress", "Completed"];
