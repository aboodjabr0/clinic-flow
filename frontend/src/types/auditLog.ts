export const AUDIT_ACTIONS = [
  "Created",
  "Updated",
  "Deleted",
  "Activated",
  "Deactivated",
  "StatusChanged",
  "Cancelled",
  "PaymentAdded",
  "LoginSucceeded",
  "LoginFailed",
  "VisitStarted",
  "VisitCompleted",
  "InvoiceCreated",
  "SettingsUpdated",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "Patient",
  "DoctorProfile",
  "DentalService",
  "ClinicSettings",
  "Appointment",
  "Visit",
  "Invoice",
  "Payment",
  "Auth",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditLogListItem {
  id: string;
  userEmail: string | null;
  userFullName: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityDisplayName: string | null;
  summary: string;
  ipAddress: string | null;
  createdAtUtc: string;
}

export interface AuditLog extends AuditLogListItem {
  userId: string | null;
  entityId: string | null;
  userAgent: string | null;
}

export interface AuditLogQuery {
  search?: string;
  userId?: string;
  entityType?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}
