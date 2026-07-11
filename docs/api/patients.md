# Patients

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Patient records: contact details, demographics, emergency contact, and free-text medical notes/allergies. Patients are never hard-deleted — they are activated/deactivated.

Role summary: all staff can **view** patients; only Admin and Receptionist can **create/update/deactivate** them. Doctors are view-only.

Structured pre-treatment medical history (risk flags, statuses, allergy/medication notes) lives at `/api/patients/{patientId}/medical-history` — see [medical-history.md](medical-history.md).

## GET /api/patients

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

## GET /api/patients/stats

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

## GET /api/patients/{id}

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

## POST /api/patients

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

## PUT /api/patients/{id}

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

## PATCH /api/patients/{id}/status

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
