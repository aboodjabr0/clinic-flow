# Dental Services

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

The dental service catalog (cleaning, filling, whitening, …) with default prices and durations. Services are referenced by appointments and used to pre-fill invoice subtotals.

## GET /api/dental-services

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

## GET /api/dental-services/{id}

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

## POST /api/dental-services

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

## PUT /api/dental-services/{id}

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

## PATCH /api/dental-services/{id}/status

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
