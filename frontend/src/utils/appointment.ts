import type { AppointmentStatus } from "../types/appointment";
import type { UserRole } from "../types/auth";
import type { TranslationKey } from "../i18n/translations";

export const APPOINTMENT_STATUS_LABEL_KEYS: Record<AppointmentStatus, TranslationKey> = {
  Scheduled: "status.appointment.scheduled",
  Arrived: "status.appointment.arrived",
  InProgress: "status.appointment.inProgress",
  Completed: "status.appointment.completed",
  Cancelled: "status.appointment.cancelled",
  NoShow: "status.appointment.noShow",
};

export const APPOINTMENT_STATUS_VARIANTS: Record<AppointmentStatus, "success" | "warning" | "danger" | "neutral"> = {
  Scheduled: "neutral",
  Arrived: "warning",
  InProgress: "warning",
  Completed: "success",
  Cancelled: "danger",
  NoShow: "danger",
};

export const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "Scheduled",
  "Arrived",
  "InProgress",
  "Completed",
  "Cancelled",
  "NoShow",
];

/** Adds `durationMinutes` to a "HH:mm" time string, returning "HH:mm". */
export function addMinutesToTime(time: string, durationMinutes: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const totalMinutes = (hours * 60 + minutes + durationMinutes + 24 * 60) % (24 * 60);
  const resultHours = Math.floor(totalMinutes / 60);
  const resultMinutes = totalMinutes % 60;
  return `${String(resultHours).padStart(2, "0")}:${String(resultMinutes).padStart(2, "0")}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

/**
 * Mirrors the backend's role-based status transition rules (see
 * AppointmentsController.AllowedStatusTransitionsByRole) so the UI only
 * offers statuses the current user is actually allowed to set. The backend
 * remains the source of truth and re-validates on every request.
 */
export function getAllowedStatusTransitions(role: UserRole): AppointmentStatus[] {
  switch (role) {
    case "Admin":
      return ALL_APPOINTMENT_STATUSES;
    case "Receptionist":
      return ["Scheduled", "Arrived", "Cancelled", "NoShow"];
    case "Doctor":
      return ["InProgress", "Completed"];
    default:
      return [];
  }
}
