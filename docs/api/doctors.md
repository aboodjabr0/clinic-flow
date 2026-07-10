# Doctors

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Doctor *profiles* (name, specialty, license, contact info) are separate from login accounts (`AppUser`). A profile can optionally be linked to a login account with role `Doctor` via `appUserId`; that link is what scopes a Doctor login to "their own" appointments, visits, dashboard, and reports.

## GET /api/doctors

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

## GET /api/doctors/{id}

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

## POST /api/doctors

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

## PUT /api/doctors/{id}

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

## PATCH /api/doctors/{id}/status

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
