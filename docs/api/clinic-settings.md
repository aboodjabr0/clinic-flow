# Clinic Settings

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

A single settings record for the clinic (name, contact info, opening hours, default currency). There is exactly one settings row; the GET returns it and the PUT updates it — there are no create/delete endpoints.

## GET /api/clinic-settings

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

## PUT /api/clinic-settings

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
