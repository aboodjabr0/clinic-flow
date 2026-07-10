# ClinicFlow API Reference

Complete reference for every endpoint in the ClinicFlow backend (ASP.NET Core Web API). This file is the combined reference; the same content is split per module under [docs/api/](api/).

- Local base URL: `http://localhost:5106`
- Interactive docs: Swagger UI at [`/swagger`](http://localhost:5106/swagger) (enabled in all environments)
- Health check: `GET /api/health`

## Modules

| Module | File | Endpoints |
|---|---|---|
| [Health](#health) | [api/health.md](api/health.md) | 1 |
| [Auth](#auth) | [api/auth.md](api/auth.md) | 5 |
| [Doctors](#doctors) | [api/doctors.md](api/doctors.md) | 5 |
| [Dental Services](#dental-services) | [api/dental-services.md](api/dental-services.md) | 5 |
| [Clinic Settings](#clinic-settings) | [api/clinic-settings.md](api/clinic-settings.md) | 2 |
| [Patients](#patients) | [api/patients.md](api/patients.md) | 6 |
| [Appointments](#appointments) | [api/appointments.md](api/appointments.md) | 9 |
| [Visits](#visits) | [api/visits.md](api/visits.md) | 8 |
| [Invoices & Payments](#invoices--payments) | [api/invoices.md](api/invoices.md) | 9 |
| [Dashboard](#dashboard) | [api/dashboard.md](api/dashboard.md) | 6 |
| [Reports](#reports) | [api/reports.md](api/reports.md) | 3 |
| [Audit Logs](#audit-logs) | [api/audit-logs.md](api/audit-logs.md) | 2 |

**Total: 61 endpoints.**

## Conventions

These apply to every endpoint below and are not repeated per endpoint.

### Authentication

All endpoints except `GET /api/health` and `POST /api/auth/login` require a JWT:

```http
Authorization: Bearer <token>
```

Tokens come from `POST /api/auth/login` and expire after `Jwt__ExpiresMinutes` (default 60). There are no refresh tokens.

### Roles and policies

Three roles exist: `Admin`, `Doctor`, `Receptionist`. Endpoints are protected by these policies (defined in `Program.cs`):

| Policy | Roles |
|---|---|
| `StaffOnly` | Admin, Doctor, Receptionist |
| `AdminOnly` | Admin |
| `AdminOrReceptionist` | Admin, Receptionist |
| `AdminOrDoctor` | Admin, Doctor |

Missing/invalid/expired token → `401 Unauthorized`. Valid token but insufficient role → `403 Forbidden`.

### Response envelopes

All JSON is camelCase. Successful responses use:

```json
{ "success": true, "data": { }, "message": "optional human-readable message" }
```

Errors (validation, business rules, not-found, unhandled) use:

```json
{ "success": false, "message": "Safe, generic message.", "traceId": "request trace id" }
```

Internal exception details are never returned to clients; unhandled exceptions become a generic `500` via `ErrorHandlingMiddleware`.

### Status codes

- `200 OK` — all successful responses, **including creates** (the API returns `200`, not `201`).
- `400 Bad Request` — DTO validation failures (the first validation message is returned) and most business-rule violations.
- `401 Unauthorized` / `403 Forbidden` — see above.
- `404 Not Found` — missing resource, with a module-specific message.
- `409 Conflict` — duplicate-name conflicts (dental services) and doctor↔account link conflicts.
- `500 Internal Server Error` — unexpected failure, generic envelope.

### Pagination

List endpoints that paginate accept `pageNumber` (default 1) and `pageSize` (default 10, maximum 100; values below 1 fall back to the defaults) and return:

```json
{ "items": [], "pageNumber": 1, "pageSize": 10, "totalCount": 0, "totalPages": 0 }
```

### Dates and times

- Dates: `"yyyy-MM-dd"` (e.g. `"2026-07-10"`).
- Times of day: `"HH:mm"` strings (e.g. `"09:00"`), matching HTML time inputs.
- Timestamps: UTC ISO 8601, fields suffixed `Utc` (e.g. `createdAtUtc`).

### Role access at a glance

| Area | Admin | Receptionist | Doctor |
|---|---|---|---|
| Patients | full | full | view only |
| Doctors, Services | full | view only | view only |
| Clinic settings | read/write | read | read |
| Appointments | full, any status | create/edit/cancel; status: Scheduled/Arrived/Cancelled/NoShow | view; status: InProgress/Completed |
| Visits | full | view only | start/update/complete own only |
| Invoices & payments | full | full | view only |
| Dashboard | full incl. financials | full incl. financials | scoped to self, no financials |
| Reports | all | all | appointments report only (own) |
| Audit logs | read | none | none |

---

## Health


### GET /api/health

Description:
Liveness/readiness check. Returns the app name, environment name, and current UTC time. Used by deployment platforms (e.g. Render health checks) and for local smoke testing. Does not touch the database.

Auth:
Not required (anonymous).

Allowed roles:
Everyone (no authentication).

Request body: none.
Query parameters: none.
Route parameters: none.

Success status code: `200 OK`

Response shape: `ApiResponse<HealthResponseDto>` — `status`, `appName`, `environment`, `utcTime`.

Example request:

```bash
curl http://localhost:5106/api/health
```

Example response:

```json
{
  "success": true,
  "data": {
    "status": "Healthy",
    "appName": "ClinicFlow.Api",
    "environment": "Development",
    "utcTime": "2026-07-10T12:00:00.000Z"
  },
  "message": null
}
```

Error status codes:
- `500 Internal Server Error` — unexpected failure (generic envelope, no details).

Notes/business rules:
- `appName` comes from the `AppName` configuration value (defaults to `ClinicFlow.Api`).
- `environment` reflects `ASPNETCORE_ENVIRONMENT`.

## Auth


Authentication is JWT-based. `POST /api/auth/login` returns a signed bearer token; all other protected endpoints require it in the `Authorization: Bearer <token>` header. Tokens expire after `Jwt__ExpiresMinutes` (default 60 minutes). There is no refresh token — the client logs in again after expiry.

### POST /api/auth/login

Description:
Authenticates a user by email and password and returns a JWT plus the user's profile. Both successful and failed attempts are written to the audit log (`LoginSucceeded` / `LoginFailed`) without recording the password or token.

Auth:
Not required (anonymous).

Allowed roles:
Everyone.

Request body (`LoginRequestDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | yes | valid email, max 256 chars |
| `password` | string | yes | max 200 chars |

Success status code: `200 OK`

Response shape: `ApiResponse<LoginResponseDto>` — `token` (JWT string) and `user` (`id`, `fullName`, `email`, `role`).

Example request:

```bash
curl -X POST http://localhost:5106/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinicflow.local","password":"Admin@12345!"}'
```

Example response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Clinic Admin",
      "email": "admin@clinicflow.local",
      "role": "Admin"
    }
  },
  "message": "Login successful"
}
```

Error status codes:
- `400 Bad Request` — missing/invalid fields (validation message).
- `401 Unauthorized` — wrong email or password, or inactive account. Always the same generic message ("Invalid email or password.") to prevent user enumeration.

Notes/business rules:
- Inactive (`isActive = false`) accounts cannot log in.
- No login rate limiting exists yet (tracked as a TODO in `AuthController`); add throttling before real production use.

### GET /api/auth/me

Description:
Returns the profile of the currently authenticated user, based on the JWT's subject claim. The frontend calls this on page load to re-validate a stored token.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist (any authenticated user).

Success status code: `200 OK`

Response shape: `ApiResponse<AuthUserDto>` — `id`, `fullName`, `email`, `role`.

Example request:

```bash
curl http://localhost:5106/api/auth/me -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fullName": "Clinic Admin",
    "email": "admin@clinicflow.local",
    "role": "Admin"
  },
  "message": null
}
```

Error status codes:
- `401 Unauthorized` — missing/invalid/expired token, unparsable subject claim, or the account has been deactivated since the token was issued ("Account is no longer active.").

### POST /api/auth/logout

Description:
Stateless logout acknowledgement. JWTs are not stored or revoked server-side; the client is responsible for discarding the token. This endpoint exists so the frontend has a consistent logout call.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Request body: none.

Success status code: `200 OK`

Example response:

```json
{ "success": true, "data": {}, "message": "Logged out" }
```

Error status codes:
- `401 Unauthorized` — missing/invalid token.

Notes/business rules:
- The token remains technically valid until it expires; there is no server-side token blacklist.

### GET /api/auth/protected-test

Description:
Diagnostic endpoint to verify that a token authenticates successfully. Not used by the frontend UI.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK`

Example response:

```json
{ "success": true, "data": {}, "message": "You are authenticated." }
```

Error status codes:
- `401 Unauthorized` — missing/invalid token.

### GET /api/auth/admin-test

Description:
Diagnostic endpoint to verify the `AdminOnly` authorization policy. Not used by the frontend UI.

Auth:
Required.

Allowed roles:
Admin only.

Success status code: `200 OK`

Example response:

```json
{ "success": true, "data": {}, "message": "You have Admin access." }
```

Error status codes:
- `401 Unauthorized` — missing/invalid token.
- `403 Forbidden` — authenticated but not an Admin.

## Doctors


Doctor *profiles* (name, specialty, license, contact info) are separate from login accounts (`AppUser`). A profile can optionally be linked to a login account with role `Doctor` via `appUserId`; that link is what scopes a Doctor login to "their own" appointments, visits, dashboard, and reports.

### GET /api/doctors

Description:
Returns all doctor profiles (active and inactive). Not paginated.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK`

Response shape: `ApiResponse<DoctorDto[]>`.

Example request:

```bash
curl http://localhost:5106/api/doctors -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "appUserId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "fullName": "Dr. Sarah Mitchell",
      "email": "sarah.mitchell@clinicflow.local",
      "phoneNumber": "+1-555-0101",
      "specialty": "General Dentistry",
      "licenseNumber": "DDS-2020-1234",
      "bio": "General and cosmetic dentistry.",
      "isActive": true,
      "createdAtUtc": "2026-07-08T21:00:00Z",
      "updatedAtUtc": null
    }
  ],
  "message": null
}
```

Error status codes:
- `401 Unauthorized`, `403 Forbidden`.

### GET /api/doctors/{id}

Description:
Returns a single doctor profile by id.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the doctor profile.

Success status code: `200 OK` — `ApiResponse<DoctorDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Doctor not found."

### POST /api/doctors

Description:
Creates a new doctor profile.

Auth:
Required.

Allowed roles:
Admin only.

Request body (`CreateDoctorDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `fullName` | string | yes | max 200 |
| `email` | string | yes | valid email, max 256 |
| `phoneNumber` | string | no | max 30 |
| `specialty` | string | yes | max 150 |
| `licenseNumber` | string | no | max 100 |
| `bio` | string | no | max 2000 |
| `appUserId` | GUID | no | must reference an existing login account with role Doctor |

Success status code: `200 OK` — `ApiResponse<DoctorDto>` with message "Doctor created".

Example request:

```bash
curl -X POST http://localhost:5106/api/doctors \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fullName":"Dr. Omar Haddad","email":"omar.haddad@clinicflow.local","specialty":"Orthodontics"}'
```

Error status codes:
- `400 Bad Request` — validation failure.
- `401`, `403`.
- `409 Conflict` — `appUserId` does not reference an existing account, or that account is already linked to another doctor profile.

Notes/business rules:
- Creating a doctor profile does **not** create a login account. Account creation is currently seed-only (no user-management endpoints exist yet).
- The action is audit-logged.

### PUT /api/doctors/{id}

Description:
Updates a doctor profile. Full replacement — send all fields (same body as create, `UpdateDoctorDto`).

Auth:
Required.

Allowed roles:
Admin only.

Route parameters:
- `id`: GUID of the doctor profile.

Success status code: `200 OK` — `ApiResponse<DoctorDto>` with message "Doctor updated".

Error status codes:
- `400` — validation failure.
- `401`, `403`.
- `404 Not Found` — "Doctor not found."
- `409 Conflict` — invalid or already-linked `appUserId`.

### PATCH /api/doctors/{id}/status

Description:
Activates or deactivates a doctor profile (soft enable/disable — there is no hard delete).

Auth:
Required.

Allowed roles:
Admin only.

Route parameters:
- `id`: GUID of the doctor profile.

Request body (`SetActiveStatusDto`):

```json
{ "isActive": false }
```

Success status code: `200 OK` — `ApiResponse<DoctorDto>` with message "Doctor status updated".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "Doctor not found."

Notes/business rules:
- Deactivating a doctor profile does not deactivate the linked login account, and it does not affect existing appointments.

## Dental Services


The dental service catalog (cleaning, filling, whitening, …) with default prices and durations. Services are referenced by appointments and used to pre-fill invoice subtotals.

### GET /api/dental-services

Description:
Returns all dental services (active and inactive). Not paginated.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<DentalServiceDto[]>`.

Example request:

```bash
curl http://localhost:5106/api/dental-services -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Teeth Cleaning",
      "description": "Routine dental cleaning and polishing.",
      "defaultPrice": 45.00,
      "durationMinutes": 45,
      "isActive": true,
      "createdAtUtc": "2026-07-08T21:00:00Z",
      "updatedAtUtc": null
    }
  ],
  "message": null
}
```

Error status codes:
- `401 Unauthorized`, `403 Forbidden`.

### GET /api/dental-services/{id}

Description:
Returns a single dental service by id.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the service.

Success status code: `200 OK` — `ApiResponse<DentalServiceDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Dental service not found."

### POST /api/dental-services

Description:
Creates a new dental service.

Auth:
Required.

Allowed roles:
Admin only.

Request body (`CreateDentalServiceDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | max 150, unique |
| `description` | string | no | max 1000 |
| `defaultPrice` | decimal | yes | 0–100000 |
| `durationMinutes` | int | yes | 1–600 |

Success status code: `200 OK` — `ApiResponse<DentalServiceDto>` with message "Dental service created".

Example request:

```bash
curl -X POST http://localhost:5106/api/dental-services \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Root Canal","defaultPrice":250,"durationMinutes":90}'
```

Error status codes:
- `400 Bad Request` — validation failure.
- `401`, `403`.
- `409 Conflict` — "A dental service with this name already exists."

### PUT /api/dental-services/{id}

Description:
Updates a dental service. Full replacement — same body as create (`UpdateDentalServiceDto`).

Auth:
Required.

Allowed roles:
Admin only.

Route parameters:
- `id`: GUID of the service.

Success status code: `200 OK` — `ApiResponse<DentalServiceDto>` with message "Dental service updated".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "Dental service not found."
- `409 Conflict` — duplicate name.

Notes/business rules:
- Changing `defaultPrice` does not retroactively change existing appointments or invoices; the price is copied at booking/invoicing time.

### PATCH /api/dental-services/{id}/status

Description:
Activates or deactivates a service (soft enable/disable — no hard delete).

Auth:
Required.

Allowed roles:
Admin only.

Route parameters:
- `id`: GUID of the service.

Request body (`SetActiveStatusDto`):

```json
{ "isActive": false }
```

Success status code: `200 OK` — `ApiResponse<DentalServiceDto>` with message "Dental service status updated".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "Dental service not found."

## Clinic Settings


A single settings record for the clinic (name, contact info, opening hours, default currency). There is exactly one settings row; the GET returns it and the PUT updates it — there are no create/delete endpoints.

### GET /api/clinic-settings

Description:
Returns the clinic settings record.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<ClinicSettingsDto>`.

Example request:

```bash
curl http://localhost:5106/api/clinic-settings -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "clinicName": "ClinicFlow Dental",
    "phoneNumber": "+1-555-0100",
    "email": "hello@clinicflow.local",
    "address": "12 Main Street",
    "openingTime": "09:00",
    "closingTime": "18:00",
    "defaultCurrency": "USD",
    "createdAtUtc": "2026-07-08T21:00:00Z",
    "updatedAtUtc": null
  },
  "message": null
}
```

Error status codes:
- `401 Unauthorized`, `403 Forbidden`.

Notes/business rules:
- The frontend hides the Settings page from non-Admin roles, but the backend GET is intentionally open to all staff (e.g. to display the clinic name/currency).

### PUT /api/clinic-settings

Description:
Updates the clinic settings record.

Auth:
Required.

Allowed roles:
Admin only.

Request body (`UpdateClinicSettingsDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `clinicName` | string | yes | max 200 |
| `phoneNumber` | string | no | max 30 |
| `email` | string | no | valid email, max 256 |
| `address` | string | no | max 300 |
| `openingTime` | string | no | exact `"HH:mm"` format, e.g. `"09:00"` |
| `closingTime` | string | no | exact `"HH:mm"` format |
| `defaultCurrency` | string | yes | max 10, e.g. `"USD"` |

Success status code: `200 OK` — `ApiResponse<ClinicSettingsDto>` with message "Clinic settings updated".

Example request:

```bash
curl -X PUT http://localhost:5106/api/clinic-settings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"clinicName":"ClinicFlow Dental","defaultCurrency":"USD","openingTime":"09:00","closingTime":"18:00"}'
```

Error status codes:
- `400 Bad Request` — validation failure, or "Opening time must be in HH:mm format." / "Closing time must be in HH:mm format."
- `401`, `403`.

Notes/business rules:
- Opening/closing times are informational; the backend does not currently reject appointments booked outside these hours.
- The update is audit-logged (`SettingsUpdated`).

## Patients


Patient records: contact details, demographics, emergency contact, and free-text medical notes/allergies. Patients are never hard-deleted — they are activated/deactivated.

Role summary: all staff can **view** patients; only Admin and Receptionist can **create/update/deactivate** them. Doctors are view-only.

### GET /api/patients

Description:
Returns a paginated list of patients. The list projection deliberately omits medical text fields (`medicalNotes`, `allergies`, address, emergency contact) — those appear only in the single-patient response.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Query parameters:
- `search`: optional string — matches name, phone, or email.
- `isActive`: optional boolean.
- `gender`: optional — one of `Male`, `Female`, `Other`, `PreferNotToSay`.
- `pageNumber`: optional int, default 1.
- `pageSize`: optional int, default 10, max 100.

Success status code: `200 OK` — `ApiResponse<PaginatedResponse<PatientListItemDto>>`.

Example request:

```bash
curl "http://localhost:5106/api/patients?search=smith&isActive=true&pageNumber=1&pageSize=10" \
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
        "fullName": "John Smith",
        "phoneNumber": "+1-555-0134",
        "email": "john.smith@example.com",
        "gender": "Male",
        "dateOfBirth": "1988-04-12",
        "isActive": true,
        "createdAtUtc": "2026-07-08T21:00:00Z"
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
- `400 Bad Request` — "Invalid gender filter."
- `401 Unauthorized`, `403 Forbidden`.

### GET /api/patients/stats

Description:
Returns headline patient counts for the Patients page cards.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<PatientStatsDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "totalPatients": 42,
    "activePatients": 40,
    "inactivePatients": 2,
    "newPatientsThisMonth": 5
  },
  "message": null
}
```

Error status codes: `401`, `403`.

### GET /api/patients/{id}

Description:
Returns the full patient record, including medical notes, allergies, address, and emergency contact.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<PatientDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "firstName": "John",
    "lastName": "Smith",
    "fullName": "John Smith",
    "phoneNumber": "+1-555-0134",
    "email": "john.smith@example.com",
    "gender": "Male",
    "dateOfBirth": "1988-04-12",
    "address": "45 Elm Street",
    "emergencyContactName": "Jane Smith",
    "emergencyContactPhone": "+1-555-0135",
    "medicalNotes": "Sensitive to cold.",
    "allergies": "Penicillin",
    "isActive": true,
    "createdAtUtc": "2026-07-08T21:00:00Z",
    "updatedAtUtc": null
  },
  "message": null
}
```

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Patient not found."

### POST /api/patients

Description:
Registers a new patient.

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Request body (`CreatePatientDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `firstName` | string | yes | max 100 |
| `lastName` | string | yes | max 100 |
| `phoneNumber` | string | yes | max 30 |
| `email` | string | no | valid email, max 256 |
| `gender` | string | yes | `Male`, `Female`, `Other`, `PreferNotToSay` |
| `dateOfBirth` | date | no | `yyyy-MM-dd`, not in the future |
| `address` | string | no | max 300 |
| `emergencyContactName` | string | no | max 200 |
| `emergencyContactPhone` | string | no | max 30 |
| `medicalNotes` | string | no | max 2000 |
| `allergies` | string | no | max 1000 |

Success status code: `200 OK` — `ApiResponse<PatientDto>` with message "Patient created".

Example request:

```bash
curl -X POST http://localhost:5106/api/patients \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Smith","phoneNumber":"+1-555-0134","gender":"Male"}'
```

Error status codes:
- `400 Bad Request` — validation failure, "Invalid gender.", or "Date of birth cannot be in the future."
- `401`, `403`.

Notes/business rules:
- The action is audit-logged.
- Duplicate patients are not blocked (no uniqueness constraint on name/phone) — front-desk staff are expected to search first.

### PUT /api/patients/{id}

Description:
Updates a patient record. Full replacement — same body as create (`UpdatePatientDto`).

Auth:
Required.

Allowed roles:
Admin, Receptionist.

Route parameters:
- `id`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<PatientDto>` with message "Patient updated".

Error status codes:
- `400` — validation failure / invalid gender / future date of birth.
- `401`, `403`.
- `404 Not Found` — "Patient not found."

### PATCH /api/patients/{id}/status

Description:
Activates or deactivates a patient (soft delete substitute).

Auth:
Required.

Allowed roles:
Admin, Receptionist.

Route parameters:
- `id`: GUID of the patient.

Request body (`SetActiveStatusDto`):

```json
{ "isActive": false }
```

Success status code: `200 OK` — `ApiResponse<PatientDto>` with message "Patient status updated".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "Patient not found."

Notes/business rules:
- Deactivating a patient does not cancel their existing appointments; that must be done separately.

## Appointments


Appointments link a patient, a doctor profile, and a dental service to a date and a start/end time. The service's price is copied onto the appointment at booking time.

Appointment statuses: `Scheduled` → `Arrived` → `InProgress` → `Completed`, plus `Cancelled` and `NoShow`.

Role summary:
- All staff can view appointments.
- Admin and Receptionist create, edit, and cancel.
- Status changes via `PATCH /status` are role-limited: Receptionist may set `Scheduled`, `Arrived`, `Cancelled`, `NoShow`; Doctor may set `InProgress`, `Completed`; Admin may set anything.
- In practice, doctors move appointments to `InProgress`/`Completed` through the Visits workflow (start/complete visit) rather than this endpoint.

### GET /api/appointments

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

### GET /api/appointments/today

Description:
Returns today's appointments (not paginated), for the front-desk day view.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<AppointmentListItemDto[]>`.

Error status codes: `401`, `403`.

### GET /api/appointments/stats

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

### GET /api/appointments/{id}

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

### GET /api/patients/{patientId}/appointments

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

### POST /api/appointments

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

### PUT /api/appointments/{id}

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

### PATCH /api/appointments/{id}/status

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

### PATCH /api/appointments/{id}/cancel

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

## Visits


A visit is the clinical record created when a doctor sees a patient for an appointment (1:1 with its appointment). It holds the chief complaint, diagnosis/treatment notes, tooth numbers, a plain-text prescription, an optional follow-up date, and internal notes.

Visit statuses: `InProgress`, `Completed`.

Role summary:
- All staff can **view** visits.
- Only Admin and Doctor can start, update, and complete visits. Receptionists are view-only.
- **Doctor ownership**: a Doctor login may only start/update/complete visits for appointments booked with their own linked `DoctorProfile`. Acting on another doctor's appointment/visit returns `403`. A Doctor login with no linked doctor profile is rejected (`403`) on all visit mutations, since ownership cannot be verified. Admin has no restriction.

### GET /api/visits

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

### GET /api/visits/stats

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

### GET /api/visits/{id}

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

### GET /api/appointments/{appointmentId}/visit

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

### GET /api/patients/{patientId}/visits

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

### POST /api/appointments/{appointmentId}/visit/start

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

### PUT /api/visits/{id}

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

### PATCH /api/visits/{id}/complete

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

## Invoices & Payments


Invoices bill a patient, optionally linked to an appointment and/or visit and a dental service. Payments are recorded against an invoice; the invoice's `paidAmount`, `remainingAmount`, and `status` are derived from its payments.

Money model: `subtotalAmount − discountAmount = totalAmount`; `totalAmount − paidAmount = remainingAmount`.

Invoice statuses (`PaymentStatus`): `Unpaid`, `PartiallyPaid`, `Paid`, `Refunded` (Refunded exists for manual bookkeeping only — no refund endpoint exists).

Payment methods: `Cash`, `Card`, `BankTransfer`, `CliQ`, `Other`.

Invoice numbers are auto-generated as `INV-{year}-{sequence}` (e.g. `INV-2026-0042`).

Role summary: all staff can **view** invoices; only Admin and Receptionist can create invoices, edit them, or record payments. Doctors are view-only.

### GET /api/invoices

Description:
Returns a paginated, filterable list of invoices.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Query parameters:
- `search`: optional string — matches invoice number or patient name/phone.
- `patientId`, `appointmentId`, `visitId`: optional GUIDs.
- `status`: optional — `Unpaid`, `PartiallyPaid`, `Paid`, `Refunded`.
- `fromDate` / `toDate`: optional `yyyy-MM-dd` (issue date range).
- `pageNumber`: optional int, default 1.
- `pageSize`: optional int, default 10, max 100.

Success status code: `200 OK` — `ApiResponse<PaginatedResponse<InvoiceListItemDto>>`.

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "invoiceNumber": "INV-2026-0042",
        "patientId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
        "patientFullName": "John Smith",
        "patientPhoneNumber": "+1-555-0134",
        "appointmentId": "9c8e3a21-2222-4562-b3fc-2c963f66afa6",
        "visitId": "1d9f4b32-3333-4562-b3fc-2c963f66afa6",
        "serviceName": "Teeth Cleaning",
        "issueDate": "2026-07-10",
        "dueDate": "2026-07-24",
        "totalAmount": 45.00,
        "paidAmount": 20.00,
        "remainingAmount": 25.00,
        "status": "PartiallyPaid"
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

### GET /api/invoices/stats

Description:
Returns invoice counts, total revenue (sum of paid amounts), and outstanding balance for the Invoices page cards.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist. (Note: this stats endpoint is staff-wide; the role-scoped financial hiding applies to the dashboard endpoints, not here.)

Success status code: `200 OK` — `ApiResponse<InvoiceStatsDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "totalInvoices": 60,
    "unpaidInvoices": 8,
    "partiallyPaidInvoices": 5,
    "paidInvoices": 47,
    "totalRevenue": 4820.00,
    "outstandingBalance": 640.00
  },
  "message": null
}
```

Error status codes: `401`, `403`.

### GET /api/invoices/{id}

Description:
Returns the full invoice, including its payment history.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the invoice.

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` (includes `payments: PaymentDto[]`, each with amount, date, method, reference, notes, and the recording user's name).

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Invoice not found."

### GET /api/patients/{patientId}/invoices

Description:
Returns a patient's invoices (not paginated).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `patientId`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<InvoiceListItemDto[]>`. Returns an empty list for an unknown patient id.

Error status codes: `401`, `403`.

### GET /api/appointments/{appointmentId}/invoice

Description:
Returns the invoice linked to an appointment, if any.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `appointmentId`: GUID of the appointment.

Success status code: `200 OK` — `ApiResponse<InvoiceDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "No invoice exists for this appointment."

### GET /api/visits/{visitId}/invoice

Description:
Returns the invoice linked to a visit, if any.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `visitId`: GUID of the visit.

Success status code: `200 OK` — `ApiResponse<InvoiceDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "No invoice exists for this visit."

### POST /api/invoices

Description:
Creates an invoice — either standalone for a patient, or linked to an appointment/visit (which auto-resolves the patient, service, and default price).

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Request body (`CreateInvoiceDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | GUID | conditional | may be omitted when `appointmentId` or `visitId` is provided — the patient is resolved from the linked record |
| `appointmentId` | GUID | no | links the invoice to an appointment |
| `visitId` | GUID | no | links the invoice to a visit |
| `dentalServiceId` | GUID | no | resolved from the appointment/visit when omitted |
| `subtotalAmount` | decimal | conditional | 0–99999999.99; may be omitted when a service can be resolved — defaults to the service's default price. Required when no service is linked |
| `discountAmount` | decimal | no | 0–99999999.99, defaults 0; cannot exceed subtotal |
| `dueDate` | date | no | `yyyy-MM-dd`, not before the issue date |
| `notes` | string | no | max 2000 |

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` with message "Invoice created".

Example request (invoice from a completed visit):

```bash
curl -X POST http://localhost:5106/api/invoices \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"visitId":"1d9f4b32-3333-4562-b3fc-2c963f66afa6","dueDate":"2026-07-24"}'
```

Error status codes:
- `400 Bad Request` — "Patient not found." / "Appointment not found." / "Visit not found." / "A patient is required when no appointment or visit is linked." / "The patient does not match the linked appointment or visit." / "The appointment does not match the linked visit." / "An invoice already exists for this appointment." / "An invoice already exists for this visit." / "Dental service not found." / "A subtotal amount is required when no service is linked." / "Discount cannot be negative." / "Discount cannot exceed the subtotal amount." / "Due date cannot be before the issue date."
- `401`, `403`.

Notes/business rules:
- At most one invoice per appointment and one per visit.
- The issue date is set to today (server date) at creation.
- The action is audit-logged (`InvoiceCreated`).

### PUT /api/invoices/{id}

Description:
Updates an invoice's editable fields. `notes` and `dueDate` are always updatable; `discountAmount` may only change while the invoice has **no recorded payments**. Pass `null`/omit `discountAmount` to leave it unchanged.

Auth:
Required.

Allowed roles:
Admin, Receptionist.

Route parameters:
- `id`: GUID of the invoice.

Request body (`UpdateInvoiceDto`):

```json
{ "discountAmount": 5.00, "dueDate": "2026-07-31", "notes": "Loyalty discount applied" }
```

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` with message "Invoice updated".

Error status codes:
- `400 Bad Request` — "The discount cannot be changed after payments have been recorded." / "Discount cannot exceed the subtotal amount." / "Due date cannot be before the issue date."
- `401`, `403`.
- `404 Not Found` — "Invoice not found."

Notes/business rules:
- Amounts other than the discount (subtotal, patient, links) cannot be changed after creation — create a new invoice instead.

### POST /api/invoices/{id}/payments

Description:
Records a payment against an invoice. Recomputes `paidAmount`, `remainingAmount`, and `status` (`PartiallyPaid` or `Paid`). The recording user is stored on the payment.

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Route parameters:
- `id`: GUID of the invoice.

Request body (`AddPaymentDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `amount` | decimal | yes | > 0, and not more than the remaining balance |
| `paymentDate` | date | yes | `yyyy-MM-dd` |
| `method` | string | yes | `Cash`, `Card`, `BankTransfer`, `CliQ`, `Other` |
| `referenceNumber` | string | no | max 100 |
| `notes` | string | no | max 1000 |

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` (updated invoice, including the new payment) with message "Payment recorded".

Example request:

```bash
curl -X POST http://localhost:5106/api/invoices/3fa85f64-5717-4562-b3fc-2c963f66afa6/payments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"amount":20.00,"paymentDate":"2026-07-10","method":"Cash"}'
```

Error status codes:
- `400 Bad Request` — "Invalid payment method." / "Payment amount must be greater than zero." / "Payment amount cannot exceed the remaining balance."
- `401`, `403`.
- `404 Not Found` — "Invoice not found."

Notes/business rules:
- Overpayment is rejected — partial payments are allowed until the balance reaches zero, at which point the invoice becomes `Paid`.
- There is no payment deletion/refund endpoint; corrections are a manual/bookkeeping concern.
- The action is audit-logged (`PaymentAdded`).

## Dashboard


Read-only aggregations for the dashboard page. Two scoping rules apply throughout:

1. **Doctor scoping** — for Doctor logins, appointment/visit data is filtered to their own linked `DoctorProfile`. A Doctor login with *no* linked profile gets empty data (the scope resolves to an id that matches no rows) rather than clinic-wide data. Admin and Receptionist always see clinic-wide data.
2. **Financial visibility** — revenue/invoice data is limited to Admin and Receptionist. Doctors get `null` financial fields on the summary, an empty `recentInvoices` list, and `403` on the revenue endpoint.

### GET /api/dashboard/summary

Description:
Headline numbers: patient counts, today/scheduled/completed appointment counts, visit counts, and (for Admin/Receptionist) invoice counts, revenue this month, and outstanding balance.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<DashboardSummaryDto>`.

Example response (Admin/Receptionist):

```json
{
  "success": true,
  "data": {
    "totalPatients": 42,
    "activePatients": 40,
    "newPatientsThisMonth": 5,
    "todayAppointments": 6,
    "scheduledAppointments": 18,
    "completedAppointmentsThisMonth": 31,
    "inProgressVisits": 1,
    "completedVisitsThisMonth": 29,
    "unpaidInvoices": 8,
    "partiallyPaidInvoices": 5,
    "paidInvoicesThisMonth": 22,
    "totalRevenueThisMonth": 1830.00,
    "outstandingBalance": 640.00
  },
  "message": null
}
```

For Doctor logins, the five financial fields (`unpaidInvoices`, `partiallyPaidInvoices`, `paidInvoicesThisMonth`, `totalRevenueThisMonth`, `outstandingBalance`) are `null`, and appointment/visit counts are scoped to that doctor.

Error status codes: `401`, `403`.

### GET /api/dashboard/today

Description:
Today's clinic activity: per-status counts plus the full appointment schedule for today (doctor-scoped for Doctors).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<TodayClinicDto>` — `date`, `totalAppointments`, `arrived`, `inProgress`, `completedToday`, `cancelledOrNoShowToday`, `appointments` (compact rows: patient, doctor, service, times, status — no reason/notes).

Error status codes: `401`, `403`.

### GET /api/dashboard/revenue

Description:
Financial dashboard: current-month revenue and outstanding amounts, all-time paid/unpaid totals, recent paid invoices, and a 6-month monthly revenue series (oldest first). "Revenue" means payments actually received; outstanding amounts come from invoice remaining balances.

Auth:
Required.

Allowed roles:
Admin, Receptionist only. **Doctors get `403`.**

Success status code: `200 OK` — `ApiResponse<DashboardRevenueDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "currentMonthRevenue": 1830.00,
    "currentMonthOutstanding": 240.00,
    "totalPaidAmount": 4820.00,
    "totalUnpaidAmount": 640.00,
    "recentPaidInvoices": [],
    "monthlyRevenue": [
      { "year": 2026, "month": 2, "label": "Feb 2026", "totalPaid": 610.00 },
      { "year": 2026, "month": 3, "label": "Mar 2026", "totalPaid": 780.00 }
    ]
  },
  "message": null
}
```

Error status codes: `401`, `403` (Doctor).

### GET /api/dashboard/appointments/status-breakdown

Description:
All-time appointment counts by status (doctor-scoped for Doctors). Used for the dashboard status chart.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<AppointmentStatusBreakdownDto>` — `scheduled`, `arrived`, `inProgress`, `completed`, `cancelled`, `noShow`.

Error status codes: `401`, `403`.

### GET /api/dashboard/recent-activity

Description:
Latest records across the clinic: recent appointments, recent visits, and recent invoices. Doctor-scoped for Doctors, whose `recentInvoices` list is always empty (financial visibility rule). Dashboard rows deliberately exclude clinical notes and appointment reasons.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<RecentActivityDto>` — `recentAppointments`, `recentVisits`, `recentInvoices`.

Error status codes: `401`, `403`.

### GET /api/dashboard/follow-ups

Description:
Upcoming follow-ups: visits with a follow-up date from today onward (doctor-scoped for Doctors). Includes the patient's phone number so reception can call to book.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<UpcomingFollowUpDto[]>` — each row: `visitId`, `patientId`, `patientFullName`, `patientPhoneNumber`, `doctorFullName`, `followUpDate`.

Error status codes: `401`, `403`.

## Reports


Simple JSON reports over a date range. When `fromDate`/`toDate` are omitted, the range defaults to the current month. All reports echo the applied range back in the response.

Role summary: the appointment report is available to all staff (Doctors see only their own appointments — any `doctorId` filter a Doctor sends is ignored). The revenue and patient reports are Admin/Receptionist only.

### GET /api/reports/appointments

Description:
Appointments within a date range with per-row operational data (no clinical notes or reasons) and summary counts.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist. Doctor results are always scoped to their own linked doctor profile; a Doctor with no linked profile gets an empty report.

Query parameters:
- `fromDate` / `toDate`: optional `yyyy-MM-dd`, default to the current month. `fromDate` must not be after `toDate`.
- `doctorId`: optional GUID — ignored for Doctor logins.
- `status`: optional appointment status filter.

Success status code: `200 OK` — `ApiResponse<AppointmentReportDto>`.

Example request:

```bash
curl "http://localhost:5106/api/reports/appointments?fromDate=2026-07-01&toDate=2026-07-31&status=Completed" \
  -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": {
    "fromDate": "2026-07-01",
    "toDate": "2026-07-31",
    "totalCount": 31,
    "completedCount": 24,
    "cancelledOrNoShowCount": 4,
    "rows": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "appointmentDate": "2026-07-10",
        "startTime": "09:00",
        "endTime": "09:45",
        "patientFullName": "John Smith",
        "doctorFullName": "Dr. Sarah Mitchell",
        "serviceName": "Teeth Cleaning",
        "status": "Completed"
      }
    ]
  },
  "message": null
}
```

Error status codes:
- `400 Bad Request` — invalid date range or "Invalid status filter."
- `401 Unauthorized`, `403 Forbidden`.

### GET /api/reports/revenue

Description:
Invoice/payment summary for a date range: invoice count, total invoiced, total paid, total outstanding, and one row per invoice issued within the range.

Auth:
Required.

Allowed roles:
Admin, Receptionist only. **Doctors get `403`.**

Query parameters:
- `fromDate` / `toDate`: optional `yyyy-MM-dd`, default to the current month.

Success status code: `200 OK` — `ApiResponse<RevenueReportDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "fromDate": "2026-07-01",
    "toDate": "2026-07-31",
    "invoiceCount": 22,
    "totalInvoiced": 2070.00,
    "totalPaid": 1830.00,
    "totalOutstanding": 240.00,
    "rows": [
      {
        "invoiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "invoiceNumber": "INV-2026-0042",
        "issueDate": "2026-07-10",
        "patientFullName": "John Smith",
        "serviceName": "Teeth Cleaning",
        "totalAmount": 45.00,
        "paidAmount": 45.00,
        "remainingAmount": 0.00,
        "status": "Paid"
      }
    ]
  },
  "message": null
}
```

Error status codes:
- `400` — invalid date range.
- `401`, `403` (Doctor).

Notes/business rules:
- Totals are computed over invoices *issued* within the range (not payments received within it).

### GET /api/reports/patients

Description:
Patients registered within a date range. Contact/registration data only — medical notes and allergies never appear in reports.

Auth:
Required.

Allowed roles:
Admin, Receptionist only. **Doctors get `403`.**

Query parameters:
- `fromDate` / `toDate`: optional `yyyy-MM-dd`, default to the current month.
- `isActive`: optional boolean.

Success status code: `200 OK` — `ApiResponse<PatientReportDto>` — `fromDate`, `toDate`, `totalCount`, `activeCount`, `rows` (id, full name, phone, gender, active flag, registered date).

Error status codes:
- `400` — invalid date range.
- `401`, `403` (Doctor).

## Audit Logs


Read-only access to the audit trail. Entries are created internally by the service layer (logins, creates, updates, status changes, cancellations, visit start/complete, invoice creation, payments, settings updates) — there are no endpoints to create, edit, or delete audit entries.

Audit entries record *who did what to which entity* (user identity, action, entity type/id, display name, human-readable summary, IP address, user agent, timestamp). They deliberately contain **no clinical text, passwords, or tokens**.

Known actions: `Created`, `Updated`, `Deleted`, `Activated`, `Deactivated`, `StatusChanged`, `Cancelled`, `PaymentAdded`, `LoginSucceeded`, `LoginFailed`, `VisitStarted`, `VisitCompleted`, `InvoiceCreated`, `SettingsUpdated`.
Known entity types: `Patient`, `DoctorProfile`, `DentalService`, `ClinicSettings`, `Appointment`, `Visit`, `Invoice`, `Payment`, `Auth`.

### GET /api/audit-logs

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

### GET /api/audit-logs/{id}

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
