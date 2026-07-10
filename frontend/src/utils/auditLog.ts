import type { TranslationKey } from "../i18n/translations";

const ACTION_LABEL_KEYS: Record<string, TranslationKey> = {
  Created: "auditAction.created",
  Updated: "auditAction.updated",
  Deleted: "auditAction.deleted",
  Activated: "auditAction.activated",
  Deactivated: "auditAction.deactivated",
  StatusChanged: "auditAction.statusChanged",
  Cancelled: "auditAction.cancelled",
  PaymentAdded: "auditAction.paymentAdded",
  LoginSucceeded: "auditAction.loginSucceeded",
  LoginFailed: "auditAction.loginFailed",
  VisitStarted: "auditAction.visitStarted",
  VisitCompleted: "auditAction.visitCompleted",
  InvoiceCreated: "auditAction.invoiceCreated",
  SettingsUpdated: "auditAction.settingsUpdated",
};

const ENTITY_TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
  Patient: "auditEntity.patient",
  DoctorProfile: "auditEntity.doctorProfile",
  DentalService: "auditEntity.dentalService",
  ClinicSettings: "auditEntity.clinicSettings",
  Appointment: "auditEntity.appointment",
  Visit: "auditEntity.visit",
  Invoice: "auditEntity.invoice",
  Payment: "auditEntity.payment",
  Auth: "auditEntity.auth",
};

/** Returns a translation key when known, otherwise the raw value as a safe fallback for `t()`. */
export function formatAuditAction(action: string): TranslationKey {
  return ACTION_LABEL_KEYS[action] ?? (action as TranslationKey);
}

/** Returns a translation key when known, otherwise the raw value as a safe fallback for `t()`. */
export function formatEntityType(entityType: string): TranslationKey {
  return ENTITY_TYPE_LABEL_KEYS[entityType] ?? (entityType as TranslationKey);
}

const DANGER_ACTIONS = new Set(["Deleted", "Deactivated", "Cancelled", "LoginFailed"]);
const SUCCESS_ACTIONS = new Set(["Created", "Activated", "PaymentAdded", "LoginSucceeded", "InvoiceCreated", "VisitCompleted"]);
const WARNING_ACTIONS = new Set(["Updated", "StatusChanged", "SettingsUpdated", "VisitStarted"]);

export function getAuditActionBadgeVariant(action: string): "success" | "warning" | "danger" | "neutral" {
  if (DANGER_ACTIONS.has(action)) return "danger";
  if (SUCCESS_ACTIONS.has(action)) return "success";
  if (WARNING_ACTIONS.has(action)) return "warning";
  return "neutral";
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}
