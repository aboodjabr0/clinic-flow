# Users

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Admin-only staff account management. This is how real clinics create and maintain login accounts (`AppUser`) for Admins, Doctors, and Receptionists — separate from doctor *profiles* (see [doctors.md](doctors.md)), which hold clinical/contact info and can optionally be linked to a login via `doctorProfileId`.

## GET /api/users

Description:
Returns staff accounts, optionally filtered. Not paginated.

Auth:
Required.

Allowed roles:
Admin only.

Query parameters:
- `search` (string, optional) — matches full name or email (case-insensitive substring).
- `role` (string, optional) — `Admin`, `Doctor`, or `Receptionist`.
- `isActive` (bool, optional).

Success status code: `200 OK` — `ApiResponse<UserDto[]>`.

Example request:

```bash
curl "http://localhost:5106/api/users?role=Doctor&isActive=true" \
  -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Dr. Sarah Mitchell",
      "email": "sarah.mitchell@clinicflow.local",
      "role": "Doctor",
      "isActive": true,
      "doctorProfileId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "doctorProfileName": "Dr. Sarah Mitchell",
      "createdAtUtc": "2026-07-08T21:00:00Z",
      "updatedAtUtc": null
    }
  ],
  "message": null
}
```

Error status codes:
- `401 Unauthorized`, `403 Forbidden`.

## GET /api/users/{id}

Description:
Returns a single user account by id.

Auth:
Required.

Allowed roles:
Admin only.

Success status code: `200 OK` — `ApiResponse<UserDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "User not found."

## POST /api/users

Description:
Creates a new staff login account.

Auth:
Required.

Allowed roles:
Admin only.

Request body (`CreateUserDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `fullName` | string | yes | max 200 |
| `email` | string | yes | valid email, max 256, must be unique |
| `password` | string | yes | 8–200 characters |
| `role` | string | yes | `Admin`, `Doctor`, or `Receptionist` |
| `doctorProfileId` | GUID | no | must reference an existing, currently-unlinked doctor profile |
| `isActive` | bool | no | defaults to `true` |

Success status code: `200 OK` — `ApiResponse<UserDto>` with message "User created".

Example request:

```bash
curl -X POST http://localhost:5106/api/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Reception","email":"jane@clinicflow.local","password":"Recep@12345!","role":"Receptionist"}'
```

Error status codes:
- `400 Bad Request` — validation failure (missing/invalid field, weak password, invalid role).
- `401`, `403`.
- `409 Conflict` — email already in use, or `doctorProfileId` does not exist / is already linked to another account.

Notes/business rules:
- `doctorProfileId` is optional even when `role` is `Doctor` — a doctor's clinical profile and login account are independent (see [doctors.md](doctors.md)). Link them at creation or later via `PUT /api/users/{id}`.
- The action is audit-logged (`Created`, entity type `User`). The audit summary never includes the password.

## PUT /api/users/{id}

Description:
Updates a user's profile info (full replacement — send all fields). Does **not** change the password; use `POST /api/users/{id}/reset-password` for that.

Auth:
Required.

Allowed roles:
Admin only.

Request body (`UpdateUserDto`): `fullName`, `email`, `role`, `doctorProfileId` (optional), `isActive` — same constraints as create, minus `password`.

Success status code: `200 OK` — `ApiResponse<UserDto>` with message "User updated".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "User not found."
- `409 Conflict` — duplicate email, invalid/already-linked `doctorProfileId`, or the change would leave the clinic with zero active admins (see below).

Notes/business rules:
- The action is audit-logged (`Updated`).

## PATCH /api/users/{id}/status

Description:
Activates or deactivates a staff account (soft enable/disable — there is no hard delete). Deactivated users cannot log in.

Auth:
Required.

Allowed roles:
Admin only.

Request body (`SetActiveStatusDto`):

```json
{ "isActive": false }
```

Success status code: `200 OK` — `ApiResponse<UserDto>` with message "User status updated".

Error status codes:
- `400`, `401`, `403`.
- `404 Not Found` — "User not found."
- `409 Conflict` — "Cannot deactivate the last active admin — the clinic must always have at least one active admin."

Notes/business rules:
- This rule applies even if the admin is deactivating their own account.
- The action is audit-logged (`Activated` / `Deactivated`).

## POST /api/users/{id}/reset-password

Description:
Sets a new password for a user. Intended for Admin-assisted password resets (there is no self-service "forgot password" flow yet).

Auth:
Required.

Allowed roles:
Admin only.

Request body (`ResetPasswordDto`):

```json
{ "newPassword": "NewSecurePass1!" }
```

`newPassword` must be 8–200 characters.

Success status code: `200 OK` — `ApiResponse<UserDto>` with message "Password reset". The response never includes the password or its hash.

Error status codes:
- `400 Bad Request` — password too short/missing.
- `401`, `403`.
- `404 Not Found` — "User not found."

Notes/business rules:
- The action is audit-logged (`Updated`, summary "Password reset for user: {email}") — the audit summary never includes the plaintext password.
- The old password stops working immediately; any existing JWT the user already holds remains valid until it expires (tokens are stateless — see [auth.md](auth.md)).

## Security notes

- No endpoint ever returns `passwordHash` or a plaintext password — `UserDto` has no password field at all.
- Every write action (create, update, activate/deactivate, password reset) is written to the audit log via the same `IAuditLogService` used elsewhere in the app; summaries are checked to never contain plaintext passwords.
- The clinic can never be left with zero active Admins: both `PUT` (role/status change) and `PATCH .../status` block any operation that would remove the last active admin.
- All endpoints require the `AdminOnly` authorization policy — Doctor and Receptionist accounts get `403 Forbidden`.

## Future improvement

A `force-password-change` flag (require the user to set a new password on next login) is not implemented in this phase — `AppUser` has no "must change password" field today, and adding one would require a schema migration plus a login-flow change. Tracked as a follow-up; for now, Admins should communicate reset passwords to staff out-of-band and rely on staff changing them informally.
