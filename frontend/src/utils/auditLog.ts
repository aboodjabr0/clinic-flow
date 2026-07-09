const ACTION_LABELS: Record<string, string> = {
  Created: "Created",
  Updated: "Updated",
  Deleted: "Deleted",
  Activated: "Activated",
  Deactivated: "Deactivated",
  StatusChanged: "Status Changed",
  Cancelled: "Cancelled",
  PaymentAdded: "Payment Added",
  LoginSucceeded: "Login Succeeded",
  LoginFailed: "Login Failed",
  VisitStarted: "Visit Started",
  VisitCompleted: "Visit Completed",
  InvoiceCreated: "Invoice Created",
  SettingsUpdated: "Settings Updated",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Patient: "Patient",
  DoctorProfile: "Doctor",
  DentalService: "Dental Service",
  ClinicSettings: "Clinic Settings",
  Appointment: "Appointment",
  Visit: "Visit",
  Invoice: "Invoice",
  Payment: "Payment",
  Auth: "Auth",
};

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatEntityType(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
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
