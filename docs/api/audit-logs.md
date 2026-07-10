# Audit Logs

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Read-only access to the audit trail. Entries are created internally by the service layer (logins, creates, updates, status changes, cancellations, visit start/complete, invoice creation, payments, settings updates) — there are no endpoints to create, edit, or delete audit entries.

Audit entries record *who did what to which entity* (user identity, action, entity type/id, display name, human-readable summary, IP address, user agent, timestamp). They deliberately contain **no clinical text, passwords, or tokens**.

Known actions: `Created`, `Updated`, `Deleted`, `Activated`, `Deactivated`, `StatusChanged`, `Cancelled`, `PaymentAdded`, `LoginSucceeded`, `LoginFailed`, `VisitStarted`, `VisitCompleted`, `InvoiceCreated`, `SettingsUpdated`.
Known entity types: `Patient`, `DoctorProfile`, `DentalService`, `ClinicSettings`, `Appointment`, `Visit`, `Invoice`, `Payment`, `Auth`.

## GET /api/audit-logs

Description:
Returns a paginated, filterable list of audit log entries, newest first.

Auth:
Required.

Allowed roles:
Admin only. (Doctor and Receptionist get `403`.)

Query parameters:
- `search`: optional string — matches summary/user/entity display text.
- `userId`: optional GUID.
- `entityType`: optional string (see entity types above).
- `action`: optional string (see actions above).
- `fromDate` / `toDate`: optional `yyyy-MM-dd`.
- `pageNumber`: optional int, default 1.
- `pageSize`: optional int, default 10, max 100.

Success status code: `200 OK` — `ApiResponse<PaginatedResponse<AuditLogListItemDto>>`.

Example request:

```bash
curl "http://localhost:5106/api/audit-logs?entityType=Invoice&action=PaymentAdded" \
  -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "userEmail": "receptionist@clinicflow.local",
        "userFullName": "Front Desk",
        "userRole": "Receptionist",
        "action": "PaymentAdded",
        "entityType": "Invoice",
        "entityDisplayName": "INV-2026-0042",
        "summary": "Payment of 20.00 recorded for invoice INV-2026-0042",
        "ipAddress": "127.0.0.1",
        "createdAtUtc": "2026-07-10T09:50:00Z"
      }
    ],
    "pageNumber": 1,
    "pageSize": 10,
    "totalCount": 1,
    "totalPages": 1
  },
  "message": null
}
```

Error status codes:
- `401 Unauthorized`, `403 Forbidden` (non-Admin).

## GET /api/audit-logs/{id}

Description:
Returns a single audit log entry, including the fields omitted from the list projection (`userId`, `entityId`, `userAgent`).

Auth:
Required.

Allowed roles:
Admin only.

Route parameters:
- `id`: GUID of the audit log entry.

Success status code: `200 OK` — `ApiResponse<AuditLogDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Audit log entry not found."

Notes/business rules:
- Failed logins are recorded with the attempted email but never the password.
- Actions and entity types are stored as plain strings so new ones can be added without a migration.
