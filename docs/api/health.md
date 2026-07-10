# Health

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

## GET /api/health

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
