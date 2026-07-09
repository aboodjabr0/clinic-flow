import type { VisitStatus } from "../types/visit";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  InProgress: "In Progress",
  Completed: "Completed",
};

export const VISIT_STATUS_VARIANTS: Record<VisitStatus, "success" | "warning" | "danger" | "neutral"> = {
  InProgress: "warning",
  Completed: "success",
};

export const ALL_VISIT_STATUSES: VisitStatus[] = ["InProgress", "Completed"];
