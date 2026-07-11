# Appointments

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Appointments link a patient, a doctor profile, and a dental service to a date and a start/end time. The service's price is copied onto the appointment at booking time.

Appointment statuses: `Scheduled` → `Arrived` → `InProgress` → `Completed`, plus `Cancelled` and `NoShow`.

Role summary:
- All staff can view appointments.
- Admin and Receptionist create, edit, and cancel.
- Status changes via `PATCH /status` are role-limited: Receptionist may set `Scheduled`, `Arrived`, `Cancelled`, `NoShow`; Doctor may set `InProgress`, `Completed`; Admin may set anything.
- In practice, doctors move appointments to `InProgress`/`Completed` through the Visits workflow (start/complete visit) rather than this endpoint.

## GET /api/appointments

Description:
Returns a paginated, filterable list of appointments.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Query parameters:
- `search`: optional string — matches patient name, doctor name, or service name.
- `date`: optional `yyyy-MM-dd` — exact date.
- `fromDate` / `toDate`: optional `yyyy-MM-dd` — date range.
- `doctorId`: optional GUID (doctor profile id).
- `patientId`: optional GUID.
- `serviceId`: optional GUID.
- `status`: optional — one of the appointment statuses.
- `pageNumber`: optional int, default 1.
- `pageSize`: optional int, default 10, max 100.

Success status code: `200 OK` — `ApiResponse<PaginatedResponse<AppointmentListItemDto>>`.

Example request:

```bash
curl "http://localhost:5106/api/appointments?date=2026-07-10&status=Scheduled" \
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
        "patientId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
        "patientFullName": "John Smith",
        "patientPhoneNumber": "+1-555-0134",
        "doctorProfileId": "9c8e3a21-2222-4562-b3fc-2c963f66afa6",
        "doctorFullName": "Dr. Sarah Mitchell",
        "dentalServiceId": "1d9f4b32-3333-4562-b3fc-2c963f66afa6",
        "serviceName": "Teeth Cleaning",
        "appointmentDate": "2026-07-10",
        "startTime": "09:00",
        "endTime": "09:45",
        "status": "Scheduled",
        "reason": "Routine cleaning"
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

## GET /api/appointments/today

Description:
Returns today's appointments (not paginated), for the front-desk day view.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<AppointmentListItemDto[]>`.

Error status codes: `401`, `403`.

## GET /api/appointments/stats

Description:
Returns headline appointment counts for the Appointments page cards.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<AppointmentStatsDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "totalAppointments": 120,
    "todayAppointments": 6,
    "scheduledAppointments": 18,
    "completedAppointments": 90,
    "cancelledOrNoShowAppointments": 12
  },
  "message": null
}
```

Error status codes: `401`, `403`.

## GET /api/appointments/{id}

Description:
Returns full appointment details, including reason, notes, cancellation reason, and the service price snapshot.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the appointment.

Success status code: `200 OK` — `ApiResponse<AppointmentDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Appointment not found."

## GET /api/patients/{patientId}/appointments

Description:
Returns a patient's appointment history (not paginated).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `patientId`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<AppointmentListItemDto[]>`. Returns an empty list for an unknown patient id (no 404).

Error status codes: `401`, `403`.

## GET /api/appointments/calendar

Description:
Returns an unpaginated, calendar-ready projection of appointments in a date range, for the Day/Week calendar view on the Appointments page. Excludes `notes` and `cancellationReason` (only list-safe fields are returned). Includes `patientPhoneNumber` so the calendar card can offer the manual WhatsApp reminder action (see [USER_GUIDE.md](../USER_GUIDE.md)) — same field already exposed by the list and detail endpoints above, at the same `StaffOnly` access level.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Query parameters:
- `startDate`: required, `yyyy-MM-dd`.
- `endDate`: required, `yyyy-MM-dd`, must be on or after `startDate`. Range capped at 62 days.
- `doctorId`: optional GUID (doctor profile id). **Ignored for the Doctor role** — see below.
- `status`: optional — one of the appointment statuses.

Role behavior:
- Admin/Receptionist: see all doctors by default; `doctorId` narrows to one doctor.
- Doctor: always scoped to their own `DoctorProfile` (resolved server-side from the logged-in user's account link), regardless of any `doctorId` passed. A Doctor account with no linked `DoctorProfile` gets an empty result, not an error.

Success status code: `200 OK` — `ApiResponse<CalendarAppointmentDto[]>`.

Example request:

```bash
curl "http://localhost:5106/api/appointments/calendar?startDate=2026-07-06&endDate=2026-07-12" \
  -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "patientId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
      "patientFullName": "John Smith",
      "patientPhoneNumber": "0790000001",
      "doctorProfileId": "9c8e3a21-2222-4562-b3fc-2c963f66afa6",
      "doctorFullName": "Dr. Sarah Mitchell",
      "dentalServiceId": "1d9f4b32-3333-4562-b3fc-2c963f66afa6",
      "serviceName": "Teeth Cleaning",
      "appointmentDate": "2026-07-10",
      "startTime": "09:00",
      "endTime": "09:45",
      "status": "Scheduled",
      "reason": "Routine cleaning",
      "hasVisit": false,
      "invoiceStatus": null
    }
  ],
  "message": null
}
```

Error status codes:
- `400 Bad Request` — "startDate and endDate are required."; "endDate must be on or after startDate."; "Date range cannot exceed 62 days."; "Invalid status filter."
- `401 Unauthorized`, `403 Forbidden`.

Notes/business rules:
- This is a read-only addition alongside `GET /api/appointments` — it does not change that endpoint's behavior, request shape, or response shape.
- `hasVisit` is `true` if a Visit record exists for the appointment (no clinical detail is exposed). `invoiceStatus` is the most recent invoice's payment status for the appointment (`Unpaid`/`PartiallyPaid`/`Paid`/`Refunded`), or `null` if no invoice exists.
- Not audit-logged (read-only, like the other appointment GET endpoints).

## POST /api/appointments

Description:
Books a new appointment. The service's current default price is copied onto the appointment.

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Request body (`CreateAppointmentDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `patientId` | GUID | yes | must exist |
| `doctorProfileId` | GUID | yes | must exist |
| `dentalServiceId` | GUID | yes | must exist |
| `appointmentDate` | date | yes | `yyyy-MM-dd`, not in the past |
| `startTime` | string | yes | `"HH:mm"` |
| `endTime` | string | yes | `"HH:mm"`, after `startTime` |
| `reason` | string | no | max 500 |
| `notes` | string | no | max 2000 |

Success status code: `200 OK` — `ApiResponse<AppointmentDto>` with message "Appointment created".

Example request:

```bash
curl -X POST http://localhost:5106/api/appointments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"patientId":"8b7d2f10-1111-4562-b3fc-2c963f66afa6","doctorProfileId":"9c8e3a21-2222-4562-b3fc-2c963f66afa6","dentalServiceId":"1d9f4b32-3333-4562-b3fc-2c963f66afa6","appointmentDate":"2026-07-15","startTime":"09:00","endTime":"09:45","reason":"Routine cleaning"}'
```

Error status codes:
- `400 Bad Request` — validation failure; "Patient not found."; "Doctor not found."; "Dental service not found."; "Appointment date cannot be in the past."; "Start time must be in HH:mm format."; "End time must be after start time."; "This doctor already has an appointment that overlaps with the selected time."
- `401`, `403`.

Notes/business rules:
- **Double-booking protection**: the same doctor cannot have two overlapping appointments. `Cancelled` and `NoShow` appointments do not block a slot, so a cancelled slot can be rebooked.
- Different doctors may have overlapping times.
- The action is audit-logged.

## PUT /api/appointments/{id}

Description:
Reschedules/edits an appointment. Full replacement — same body as create (`UpdateAppointmentDto`). The same overlap and validation rules apply.

Auth:
Required.

Allowed roles:
Admin, Receptionist.

Route parameters:
- `id`: GUID of the appointment.

Success status code: `200 OK` — `ApiResponse<AppointmentDto>` with message "Appointment updated".

Error status codes:
- `400` — same validation/overlap messages as create.
- `401`, `403`.
- `404 Not Found` — "Appointment not found."

## PATCH /api/appointments/{id}/status

Description:
Changes an appointment's status. Which statuses a caller may set depends on their role.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist — with per-role limits:

| Role | May set |
|---|---|
| Admin | any status |
| Receptionist | `Scheduled`, `Arrived`, `Cancelled`, `NoShow` |
| Doctor | `InProgress`, `Completed` |

Route parameters:
- `id`: GUID of the appointment.

Request body (`UpdateAppointmentStatusDto`):

```json
{ "status": "Arrived" }
```

Success status code: `200 OK` — `ApiResponse<AppointmentDto>` with message "Appointment status updated".

Error status codes:
- `400 Bad Request` — "Invalid appointment status."
- `401 Unauthorized`.
- `403 Forbidden` — the caller's role may not set the requested status.
- `404 Not Found` — "Appointment not found."

Notes/business rules:
- Status names are parsed case-insensitively.
- Status changes are audit-logged.

## PATCH /api/appointments/{id}/cancel

Description:
Cancels an appointment with an optional cancellation reason.

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Route parameters:
- `id`: GUID of the appointment.

Request body (`CancelAppointmentDto`):

```json
{ "cancellationReason": "Patient called to cancel" }
```

(`cancellationReason` is optional, max 500 chars; send `{}` to cancel without a reason.)

Success status code: `200 OK` — `ApiResponse<AppointmentDto>` with message "Appointment cancelled".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "Appointment not found."

Notes/business rules:
- Cancellation is allowed from any non-terminal status, including `InProgress` (intentional flexibility for front-desk corrections).
- Cancelling frees the time slot for rebooking.
- The action is audit-logged.
