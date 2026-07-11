# Medical History

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Structured pre-treatment medical history for a patient: allergy/medication/condition notes, machine-readable risk flags (heart disease, blood thinners, anesthesia sensitivity), and status fields (pregnancy, smoking, diabetes). One record per patient, created and replaced through a single upsert endpoint.

This is clinical intake information a dentist reviews before treatment — it is **not** a diagnosis feature. Values are stored as plain notes, booleans, and enum names (English identifiers); the frontend translates labels for display, so no localized text is stored in the database.

Role summary: all staff can **view** medical history; only Admin and Doctor can **create/update** it. Receptionists are view-only.

Privacy:

- Audit entries are written for create/update, but the audit summary never contains medical text — only the patient's name (e.g. "Medical history updated for patient: John Smith").
- Medical history is not included in WhatsApp reminder messages, printable invoices/receipts, dashboard reports, or appointment list/calendar projections.

Enum values:

| Field | Values |
|---|---|
| `pregnancyStatus` | `Unknown`, `NotPregnant`, `Pregnant`, `NotApplicable` |
| `smokingStatus` | `Unknown`, `NeverSmoker`, `FormerSmoker`, `CurrentSmoker` |
| `diabetesStatus` | `Unknown`, `No`, `Yes` |

### GET /api/patients/{patientId}/medical-history

Description:
Returns the patient's medical history. If no history has been recorded yet, returns an empty default DTO (all fields null/false/`Unknown`, `lastUpdatedAtUtc: null`) rather than a 404, so the frontend can render an empty editable form directly.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `patientId`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<PatientMedicalHistoryDto>`.

Example request:

```bash
curl http://localhost:5106/api/patients/8b7d2f10-1111-4562-b3fc-2c963f66afa6/medical-history \
  -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": {
    "patientId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
    "allergies": "Penicillin",
    "chronicDiseases": "Hypertension",
    "currentMedications": "Aspirin 81mg daily",
    "previousSurgeries": null,
    "pregnancyStatus": "NotApplicable",
    "smokingStatus": "FormerSmoker",
    "diabetesStatus": "Yes",
    "bloodPressureNotes": "Controlled with medication",
    "heartDisease": true,
    "bloodThinners": true,
    "anesthesiaSensitivity": false,
    "medicalAlerts": "Requires antibiotic prophylaxis",
    "emergencyContactName": "Jane Smith",
    "emergencyContactPhone": "+1-555-0135",
    "lastUpdatedAtUtc": "2026-07-11T10:00:00Z",
    "lastUpdatedByUserName": "Dr. Sarah Mitchell"
  },
  "message": null
}
```

Error status codes:
- `401 Unauthorized`, `403 Forbidden`.
- `404 Not Found` — "Patient not found." (the patient id itself is unknown).

### PUT /api/patients/{patientId}/medical-history

Description:
Creates or updates (upserts) the patient's medical history. Full replacement — send the complete form state; omitted text fields are cleared, omitted enums fall back to `Unknown`, omitted booleans to `false`. Stamps `lastUpdatedAtUtc` and the acting user.

Auth:
Required.

Allowed roles:
Admin, Doctor. (Receptionists get `403` — medical history is clinical data.)

Route parameters:
- `patientId`: GUID of the patient.

Request body (`UpsertPatientMedicalHistoryDto`) — all fields optional:

| Field | Type | Constraints |
|---|---|---|
| `allergies` | string | max 1000 |
| `chronicDiseases` | string | max 1000 |
| `currentMedications` | string | max 1000 |
| `previousSurgeries` | string | max 1000 |
| `pregnancyStatus` | string | enum value (see above) |
| `smokingStatus` | string | enum value (see above) |
| `diabetesStatus` | string | enum value (see above) |
| `bloodPressureNotes` | string | max 500 |
| `heartDisease` | boolean | defaults to `false` |
| `bloodThinners` | boolean | defaults to `false` |
| `anesthesiaSensitivity` | boolean | defaults to `false` |
| `medicalAlerts` | string | max 1000 |
| `emergencyContactName` | string | max 200 |
| `emergencyContactPhone` | string | max 30 |

Success status code: `200 OK` — `ApiResponse<PatientMedicalHistoryDto>` with message "Medical history saved".

Example request:

```bash
curl -X PUT http://localhost:5106/api/patients/8b7d2f10-1111-4562-b3fc-2c963f66afa6/medical-history \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"allergies":"Penicillin","bloodThinners":true,"diabetesStatus":"Yes","heartDisease":true}'
```

Error status codes:
- `400 Bad Request` — validation failure (oversized text, invalid enum value).
- `401 Unauthorized`, `403 Forbidden`.
- `404 Not Found` — "Patient not found."

Notes/business rules:
- Exactly one medical history record per patient (unique database index on `PatientId`); repeated PUTs update the same record.
- The action is audit-logged as `Created`/`Updated` on entity type `PatientMedicalHistory` with a text-free summary.
- No file uploads or lab records in this phase — plain text and flags only.
