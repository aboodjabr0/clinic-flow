# Visits

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

A visit is the clinical record created when a doctor sees a patient for an appointment (1:1 with its appointment). It holds the chief complaint, diagnosis/treatment notes, tooth numbers, a plain-text prescription, an optional follow-up date, and internal notes.

Visit statuses: `InProgress`, `Completed`.

Role summary:
- All staff can **view** visits.
- Only Admin and Doctor can start, update, and complete visits. Receptionists are view-only.
- **Doctor ownership**: a Doctor login may only start/update/complete visits for appointments booked with their own linked `DoctorProfile`. Acting on another doctor's appointment/visit returns `403`. A Doctor login with no linked doctor profile is rejected (`403`) on all visit mutations, since ownership cannot be verified. Admin has no restriction.

## GET /api/visits

Description:
Returns a paginated, filterable list of visits (lightweight projection — no clinical note text).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Query parameters:
- `search`: optional string — matches patient/doctor/service names.
- `patientId`: optional GUID.
- `doctorId`: optional GUID (doctor profile id).
- `status`: optional — `InProgress` or `Completed`.
- `fromDate` / `toDate`: optional `yyyy-MM-dd` (visit date range).
- `pageNumber`: optional int, default 1.
- `pageSize`: optional int, default 10, max 100.

Success status code: `200 OK` — `ApiResponse<PaginatedResponse<VisitListItemDto>>`.

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "appointmentId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
        "patientId": "9c8e3a21-2222-4562-b3fc-2c963f66afa6",
        "patientFullName": "John Smith",
        "patientPhoneNumber": "+1-555-0134",
        "doctorProfileId": "1d9f4b32-3333-4562-b3fc-2c963f66afa6",
        "doctorFullName": "Dr. Sarah Mitchell",
        "serviceName": "Teeth Cleaning",
        "visitDate": "2026-07-10",
        "status": "Completed",
        "followUpDate": "2026-08-10"
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
- `400 Bad Request` — "Invalid status filter."
- `401 Unauthorized`, `403 Forbidden`.

## GET /api/visits/stats

Description:
Returns headline visit counts for the Visits page cards.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<VisitStatsDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "totalVisits": 80,
    "inProgressVisits": 2,
    "completedVisits": 78,
    "followUpsScheduled": 6
  },
  "message": null
}
```

Error status codes: `401`, `403`.

## GET /api/visits/{id}

Description:
Returns the full visit record, including all clinical notes and the prescription text.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the visit.

Success status code: `200 OK` — `ApiResponse<VisitDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "appointmentId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
    "appointmentDate": "2026-07-10",
    "appointmentStartTime": "09:00",
    "appointmentEndTime": "09:45",
    "patientId": "9c8e3a21-2222-4562-b3fc-2c963f66afa6",
    "patientFullName": "John Smith",
    "patientPhoneNumber": "+1-555-0134",
    "doctorProfileId": "1d9f4b32-3333-4562-b3fc-2c963f66afa6",
    "doctorFullName": "Dr. Sarah Mitchell",
    "serviceName": "Teeth Cleaning",
    "visitDate": "2026-07-10",
    "status": "Completed",
    "chiefComplaint": "Tooth sensitivity",
    "diagnosisNote": "Mild enamel wear on 24, 25.",
    "treatmentNote": "Cleaning performed; fluoride applied.",
    "toothNumbers": "24, 25",
    "prescriptionNote": "Sensitive toothpaste, twice daily.",
    "followUpDate": "2026-08-10",
    "internalNotes": null,
    "startedAtUtc": "2026-07-10T09:02:00Z",
    "completedAtUtc": "2026-07-10T09:40:00Z",
    "createdAtUtc": "2026-07-10T09:02:00Z",
    "updatedAtUtc": "2026-07-10T09:40:00Z"
  },
  "message": null
}
```

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Visit not found."

## GET /api/appointments/{appointmentId}/visit

Description:
Returns the visit linked to an appointment, if one has been started.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `appointmentId`: GUID of the appointment.

Success status code: `200 OK` — `ApiResponse<VisitDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "No visit exists for this appointment."

## GET /api/patients/{patientId}/visits

Description:
Returns a patient's visit history (not paginated).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `patientId`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<VisitListItemDto[]>`. Returns an empty list for an unknown patient id.

Error status codes: `401`, `403`.

## POST /api/appointments/{appointmentId}/visit/start

Description:
Starts a visit for an appointment. Sets the visit to `InProgress`, stamps `startedAtUtc`, and moves the linked appointment's status to `InProgress`.

Auth:
Required.

Allowed roles:
Admin, Doctor (own appointments only). Receptionists get `403`.

Route parameters:
- `appointmentId`: GUID of the appointment.

Request body (`StartVisitDto`):

```json
{ "chiefComplaint": "Tooth sensitivity" }
```

(`chiefComplaint` is optional, max 500 chars; send `{}` to start without one.)

Success status code: `200 OK` — `ApiResponse<VisitDto>` with message "Visit started".

Error status codes:
- `400 Bad Request` — "A visit has already been started for this appointment." / "Visits can only be started for appointments that are scheduled, arrived, or in progress."
- `401 Unauthorized`.
- `403 Forbidden` — Doctor acting on another doctor's appointment, or Doctor login with no linked doctor profile.
- `404 Not Found` — "Appointment not found."

Notes/business rules:
- Exactly one visit per appointment.
- Visits cannot be started for `Completed`, `Cancelled`, or `NoShow` appointments.
- The action is audit-logged (`VisitStarted`) with display names only — no clinical text is written to the audit trail.

## PUT /api/visits/{id}

Description:
Saves/edits the visit's clinical notes. **Full-form semantics**: every note field is overwritten with the request value, so an omitted or `null` field clears the stored value. Clients should send the complete current form state.

Auth:
Required.

Allowed roles:
Admin, Doctor (own visits only).

Route parameters:
- `id`: GUID of the visit.

Request body (`UpdateVisitDto`) — all fields optional:

| Field | Type | Constraints |
|---|---|---|
| `chiefComplaint` | string | max 500 |
| `diagnosisNote` | string | max 2000 |
| `treatmentNote` | string | max 2000 |
| `toothNumbers` | string | max 200, free text e.g. `"24, 25"` |
| `prescriptionNote` | string | max 2000, plain text |
| `followUpDate` | date | `yyyy-MM-dd`, not in the past |
| `internalNotes` | string | max 2000 |

Success status code: `200 OK` — `ApiResponse<VisitDto>` with message "Visit updated".

Error status codes:
- `400 Bad Request` — validation failure or "Follow-up date cannot be in the past."
- `401`, `403` (ownership), `404` — "Visit not found."

## PATCH /api/visits/{id}/complete

Description:
Completes a visit: sets status to `Completed`, stamps `completedAtUtc`, and moves the linked appointment to `Completed`. Accepts the same optional note fields as the update endpoint so a doctor can finalize notes and complete in one request.

Auth:
Required.

Allowed roles:
Admin, Doctor (own visits only).

Route parameters:
- `id`: GUID of the visit.

Request body (`CompleteVisitDto`): same fields as `UpdateVisitDto`, all optional. Send `{}` to complete without changing notes.

Success status code: `200 OK` — `ApiResponse<VisitDto>` with message "Visit completed".

Error status codes:
- `400 Bad Request` — "This visit has already been completed." / "Follow-up date cannot be in the past." / "The appointment linked to this visit could not be found."
- `401`, `403` (ownership), `404` — "Visit not found."

Notes/business rules:
- **Unlike PUT**, omitted fields are *preserved*, not cleared — completing with `{}` never wipes existing notes (this was a fixed data-loss bug; see `docs/TESTING.md` §6).
- Completed visits cannot be completed again; notes on a completed visit can still be edited via `PUT /api/visits/{id}`.
- The action is audit-logged (`VisitCompleted`) with display names only.
