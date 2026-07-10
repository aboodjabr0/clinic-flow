# Auth

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Authentication is JWT-based. `POST /api/auth/login` returns a signed bearer token; all other protected endpoints require it in the `Authorization: Bearer <token>` header. Tokens expire after `Jwt__ExpiresMinutes` (default 60 minutes). There is no refresh token — the client logs in again after expiry.

## POST /api/auth/login

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
- Login accounts are no longer seed-only: Admins create and manage real staff accounts via [users.md](users.md) (`POST /api/users`, etc.). Seeded demo accounts still work for local development.

## GET /api/auth/me

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

## POST /api/auth/logout

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

## GET /api/auth/protected-test

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

## GET /api/auth/admin-test

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
