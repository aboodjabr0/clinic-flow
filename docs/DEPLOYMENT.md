# ClinicFlow Deployment Guide

> **Demo deployments use fake data only.** ClinicFlow's seeding creates entirely synthetic patients, appointments, visits, and invoices. Never load real patient data into a demo environment, and treat any real-data deployment as out of scope for this guide (it would need hardening first — see "Before real production use" below).

## Demo Deployment Strategy

Three managed services, all with free tiers:

| Piece | Platform | Notes |
|---|---|---|
| Backend API | **Render** (Docker web service) | Built from `backend/Dockerfile`, listens on port 8080 |
| Database | **Neon PostgreSQL** | Serverless Postgres; use the pooled connection string |
| Frontend | **Vercel** (or Netlify) | Static Vite build, SPA fallback to `index.html` |

Deploy order: database → backend → frontend (each needs the previous one's URL/credentials).

## Database on Neon PostgreSQL

1. Create a Neon project and database.
2. Copy the connection details (host, database, user, password). Either compose a full .NET connection string or use the individual `DB_*` variables below.
3. TLS: include `SSL Mode=Require` in a full connection string for Neon.

No manual schema setup is needed — the backend applies EF Core migrations on startup when `APPLY_MIGRATIONS_ON_STARTUP=true`.

## Backend on Render

Create a **Web Service** from the repo with:

- Root directory: `backend/`
- Runtime: Docker (uses `backend/Dockerfile`; the image exposes port 8080 via `ASPNETCORE_URLS`)
- Health check path: `/api/health`

The Dockerfile installs `libgssapi-krb5-2` — Npgsql needs it and the slim ASP.NET runtime image doesn't include it; without it Postgres connections fail at runtime.

### Required backend environment variables

Use placeholders — never commit real values:

```env
ConnectionStrings__DefaultConnection=Host=your-neon-host;Port=5432;Database=clinicflow;Username=clinicflow_user;Password=your_password;SSL Mode=Require
Jwt__Key=replace_with_strong_secret_at_least_32_chars
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
APPLY_MIGRATIONS_ON_STARTUP=true
ENABLE_DEMO_SEEDING=true
SEED_ADMIN_EMAIL=demo.admin@example.com
SEED_ADMIN_PASSWORD=replace_with_demo_admin_password
SEED_ADMIN_NAME=Demo Admin
SEED_DOCTOR_PASSWORD=replace_with_demo_doctor_password
SEED_RECEPTIONIST_PASSWORD=replace_with_demo_receptionist_password
```

Alternatives and defaults:

- Instead of the full connection string you may set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (the full string takes precedence when both are present).
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpiresMinutes` are optional (defaults: `ClinicFlow.Api`, `ClinicFlow.Client`, `60`).
- `Frontend__Url` is a single-origin alternative to `CORS_ALLOWED_ORIGINS` (the latter wins and supports a comma-separated list).
- **`Jwt__Key` is mandatory outside Development** — the app refuses to start without it (the insecure dev fallback key only activates when `ASPNETCORE_ENVIRONMENT=Development`).
- The `SEED_*` overrides matter: without them the seeder uses the dev fallback passwords that are visible in the public source code.

### Migration-on-startup flag

`APPLY_MIGRATIONS_ON_STARTUP=true` makes the app run `Database.MigrateAsync()` before serving traffic. Fine for a single-instance demo; for anything bigger, run migrations as a separate deploy step instead.

### Demo seeding flag

`ENABLE_DEMO_SEEDING=true` runs the idempotent demo seeder on startup (accounts, catalog, settings, fake patients/appointments/visits/invoices). Seeding also always runs in Development. **Leave it unset for any non-demo deployment.**

## Frontend on Vercel

1. Import the repo, set the project root to `frontend/`.
2. Build command `npm run build` (this runs `tsc -b && vite build`), output directory `dist`.
3. Environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

4. Add an SPA rewrite so client-side routes work on refresh: rewrite all paths to `/index.html`. (On Netlify, the equivalent is a `/* /index.html 200` redirect rule.)

Note: `VITE_API_URL` is baked in at build time — changing it requires a rebuild, not just a restart.

## CORS Setup

The backend only accepts browser requests from the configured origins. Set `CORS_ALLOWED_ORIGINS` on the backend to the exact frontend origin (scheme + host, no trailing slash, no path):

```env
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

Multiple origins (e.g. a preview URL) are comma-separated. A wrong or missing value shows up as CORS errors in the browser console while direct `curl` calls still succeed.

## Health Check Endpoint

`GET /api/health` — anonymous, no database access, returns `200` with app name, environment, and UTC time. Use it as Render's health check path and for uptime monitoring.

## Post-Deployment Checklist

- [ ] `GET https://<backend>/api/health` returns `200` and `"environment": "Production"`.
- [ ] `GET https://<backend>/swagger` loads (Swagger is enabled in all environments — acceptable for a demo; disable it for real production).
- [ ] Render logs show migrations applied and seeding completed without errors.
- [ ] Login works from the deployed frontend for all three roles (Admin via your `SEED_ADMIN_*` values).
- [ ] No CORS errors in the browser console.
- [ ] Doctor login sees no financial cards on the dashboard and gets 403 on `/api/dashboard/revenue`.
- [ ] Non-admin gets 403 on `/api/audit-logs`.
- [ ] Creating a patient, booking an appointment, starting/completing a visit, creating an invoice, and recording a payment all succeed end-to-end.
- [ ] Confirm the demo admin password is **not** a dev fallback value from the source code.
- [ ] Confirm the deployment contains fake data only.

## Before Real Production Use (out of demo scope)

Login rate limiting, user management with forced password changes, refresh tokens/shorter sessions, disabling Swagger, separate migration step, database backups, and a real secrets manager.
