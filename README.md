# ClinicFlow

A full-stack dental clinic management system for small dental clinics: scheduling, patient records, dental visit notes, simple text prescriptions, invoicing, payments, reports, and audit logging — with role-based access for Admins, Doctors, and Receptionists.

ClinicFlow is a clinic *operations* system. It deliberately provides **no diagnosis, treatment recommendations, medical advice, or AI-based clinical suggestions** — all clinical notes and prescriptions are written manually by doctors.

> **Demo data only.** All patient and clinic data in development and demo deployments is fake/seeded.

## Documentation

| Document | Contents |
|---|---|
| [docs/API.md](docs/API.md) | Full API reference (70 endpoints, all modules) — also split per module under [docs/api/](docs/api/) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture, folder structure, auth flow, data flow, patterns |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Demo deployment (Render + Neon + static host), env vars, checklist |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | How each role uses the system |
| [docs/TESTING.md](docs/TESTING.md) | QA report, role-based endpoint coverage, testing checklists |

## Main Features

- **Authentication & roles** — JWT login; Admin / Doctor / Receptionist role-based access enforced at the backend.
- **Patients** — registration, search/filtering, demographics, emergency contacts, medical notes & allergies, activate/deactivate.
- **Patient medical history** — structured pre-treatment history per patient (allergies, chronic diseases, medications, surgeries, pregnancy/smoking/diabetes status, heart disease, blood thinners, anesthesia sensitivity, medical alerts, emergency contact), with a red risk banner on the patient, appointment, and visit pages. Editable by Admin/Doctor, view-only for Receptionist; audit-logged without the medical text; never included in WhatsApp reminders, printed documents, or reports.
- **Doctors** — doctor profiles (specialty, license, bio) optionally linked to Doctor login accounts.
- **Dental service catalog** — services with default prices and durations.
- **Appointments** — booking with double-booking protection per doctor, status workflow (Scheduled → Arrived → InProgress → Completed / Cancelled / NoShow), per-role status transitions, cancellation with reason, plus a Day/Week calendar view alongside the classic list.
- **WhatsApp appointment reminders** — Admin/Receptionist can generate a `wa.me` link with a pre-filled, editable EN/AR reminder message from the appointment list, calendar, or detail page, and open it in a new tab to send manually. No WhatsApp Business API, no automatic sending.
- **Visits** — clinical record per appointment: chief complaint, diagnosis/treatment notes, tooth numbers, plain-text prescriptions, follow-up dates. Doctors can only work on their own visits.
- **Invoices & payments** — invoices auto-filled from visits/appointments, discounts, partial payments, overpayment protection, derived payment status, auto-generated invoice numbers.
- **Printable invoices & receipts** — clean, A4-friendly invoice and payment receipt documents with a Print / Save as PDF action (via the browser print dialog), RTL-aware for Arabic.
- **Dashboard** — headline stats, today's schedule, status breakdown, recent activity, upcoming follow-ups, revenue charts (financials hidden from Doctors).
- **Reports** — appointment, revenue, and patient reports over date ranges.
- **Audit logs** — Admin-only trail of logins and all significant actions, with no clinical text, passwords, or tokens recorded.
- **User management** — Admin-only staff account management: create/edit staff, activate/deactivate, reset passwords, optionally link Doctor accounts to a doctor profile.
- **Clinic settings** — clinic name, contact info, opening hours, default currency.
- **Responsive UI** with light/dark theme.
- **Bilingual UI (English / Arabic)** — language toggle in the topbar, full RTL layout for Arabic, language preference stored locally in the browser.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite, React Router, native `fetch`, modular CSS (no UI framework) |
| Backend | ASP.NET Core Web API (.NET 10), Entity Framework Core, Swagger/OpenAPI |
| Database | PostgreSQL (EF Core migrations) |
| Auth | JWT bearer tokens, role-based authorization policies |

## User Roles

| Role | Summary |
|---|---|
| **Admin** | Everything: manage doctors, services, settings, staff user accounts; view audit logs; full patient/appointment/visit/invoice access. |
| **Receptionist** | Front desk: patients, appointment booking/cancellation, invoices & payments, reports. View-only on doctors/services/visits. |
| **Doctor** | Clinical: view patients/appointments, start/update/complete **their own** visits, write notes & prescriptions. View-only on invoices; no financial data, revenue, or audit logs. |

Admins create and manage staff login accounts from the in-app **User Management** page (`/users`) — see [docs/api/users.md](docs/api/users.md). The seeded demo accounts below remain available for local development.

## Screens / Modules

Login, Dashboard, Patients (list + details), Appointments, Doctors, Services, Visits, Invoices, Reports, Settings (Admin), Audit Logs (Admin), User Management (Admin), Access Denied.

## Local Setup

### Prerequisites

- .NET SDK 10.x
- Node.js 20+ and npm
- PostgreSQL 14+ running locally

### 1. PostgreSQL setup

Create a database and user (names are your choice; the values below match the examples):

```sql
CREATE USER clinicflow_dev WITH PASSWORD 'your_password';
CREATE DATABASE clinicflow_dev OWNER clinicflow_dev;
```

### 2. Backend setup

The backend reads its connection from environment variables — `ConnectionStrings:Default` in `appsettings.json` is intentionally empty and no secrets are committed.

```bash
cd backend

export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=clinicflow_dev
export DB_USER=clinicflow_dev
export DB_PASSWORD=your_password

dotnet restore
dotnet run
```

The API starts on `http://localhost:5106` (Swagger UI at `http://localhost:5106/swagger`, health check at `/api/health`).

In **Development**, demo seeding runs automatically on startup: demo admin/doctor/receptionist accounts, doctors, services, clinic settings, patients, appointments, visits, and invoices. A dev-only JWT signing key fallback is also used if `Jwt__Key` is not set (never rely on it outside Development).

### 3. Running migrations

Migrations live in `backend/Migrations/`. Apply them explicitly with:

```bash
cd backend
dotnet ef database update
```

or set `APPLY_MIGRATIONS_ON_STARTUP=true` to apply them automatically when the app boots (used in deployment). Creating a new migration:

```bash
dotnet ef migrations add <Name>
```

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The app runs on `http://localhost:5173` and talks to the backend via `VITE_API_URL` (defaults to `http://localhost:5106`).

## Environment Variables

### Backend

| Variable | Purpose | Example |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Full Postgres connection string (takes precedence) | `Host=localhost;Port=5432;Database=clinicflow_dev;Username=clinicflow_dev;Password=your_password` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Individual connection parts (used when no full string is set) | `localhost` / `5432` / … |
| `Jwt__Key` | JWT signing key (**required outside Development**) | `replace_with_strong_secret` |
| `Jwt__Issuer` / `Jwt__Audience` / `Jwt__ExpiresMinutes` | Token settings (defaults: `ClinicFlow.Api` / `ClinicFlow.Client` / `60`) | — |
| `Frontend__Url` | Allowed CORS origin (default `http://localhost:5173`) | `https://your-frontend.example` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated CORS origins (overrides `Frontend__Url`) | `https://a.example,https://b.example` |
| `APPLY_MIGRATIONS_ON_STARTUP` | Apply EF migrations on boot when `true` | `true` |
| `ENABLE_DEMO_SEEDING` | Force demo seeding outside Development when `true` | `true` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Override the seeded admin account | — |
| `SEED_DOCTOR_PASSWORD` / `SEED_RECEPTIONIST_PASSWORD` | Override seeded staff passwords | — |

### Frontend

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:5106` |

## Demo Credentials (local development seed)

These are the **dev-only fallback** accounts seeded in Development. They are fake accounts with fake data; override them with the `SEED_*` variables for any shared deployment.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@clinicflow.local` | `Admin@12345!` |
| Doctor (Dr. Sarah Mitchell) | `doctor@clinicflow.local` | `Doctor@12345!` |
| Receptionist | `receptionist@clinicflow.local` | `Reception@12345!` |

## How to Run (summary)

```bash
cd backend && dotnet run
```

```bash
cd frontend && npm run dev
```

Then open `http://localhost:5173` and log in with a demo account.

## Testing

Backend integration tests live in `backend/ClinicFlow.Api.Tests/` (xUnit + `WebApplicationFactory` + Testcontainers PostgreSQL — no local database or credentials needed, just Docker):

```bash
# from the repo root
dotnet test
```

The **Backend CI** GitHub Actions workflow ([.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml)) builds and runs the suite on every push/PR to `main` that touches the backend. Details, coverage, and how to add tests: [docs/TESTING.md](docs/TESTING.md) §0.

## Deployment Notes

The demo deployment targets: **backend on Render** (Docker, see `backend/Dockerfile`), **database on Neon PostgreSQL**, **frontend on a static host** (Vercel or Netlify). Set `APPLY_MIGRATIONS_ON_STARTUP=true`, `ENABLE_DEMO_SEEDING=true` (demo only), a strong `Jwt__Key`, the database connection variables, and `CORS_ALLOWED_ORIGINS` to the frontend's URL. Full instructions and a post-deployment checklist: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Security Notes

- All authorization is enforced at the backend with role policies; frontend route guards are UX only.
- Doctors are scoped server-side to their own linked doctor profile for visits, dashboard, and reports; financial data is never returned to Doctor logins on dashboard endpoints.
- Passwords are hashed with ASP.NET Core Identity's `PasswordHasher`; login failures return a generic message (no user enumeration).
- Error responses never expose exception details or stack traces (`ErrorHandlingMiddleware`).
- Audit logs contain no passwords, tokens, or clinical text.
- No secrets are committed: connection strings and the JWT key come from environment variables; a dev-only JWT key fallback exists strictly for local Development.
- CORS is restricted to the configured frontend origin(s).

## Known Limitations

- **No self-service "forgot password"** — password resets are Admin-assisted only (`POST /api/users/{id}/reset-password`), and there is no "force password change on next login" flag yet.
- **No login rate limiting** — flagged as a TODO in `AuthController`; add throttling before real production use.
- **No refresh tokens / server-side logout** — tokens simply expire (default 60 minutes).
- **No frontend test suite** — backend integration tests exist (see [docs/TESTING.md](docs/TESTING.md) §0), but the frontend is still tested manually.
- Creates return `200 OK` rather than `201 Created`.
- No refund/payment-correction endpoint (the `Refunded` status is manual bookkeeping only).
- Opening hours in clinic settings are informational; bookings outside them are not blocked.
- Single-clinic system — no multi-tenant support.
- **WhatsApp reminders are manual only** — no WhatsApp Business API integration, no automatic/scheduled sending, and no record is kept of whether a reminder was actually sent (would need a schema change; see Future Improvements). Phone normalization targets Jordan mobile numbers (`07xxxxxxxx` / `+9627xxxxxxxx`) — other country formats are treated as invalid.
- **Medical history is text and flags only** — no file uploads, lab records, scanned documents, or structured per-allergy tables; the patient form's legacy free-text medical notes/allergies fields still exist alongside the structured history.

## Screenshots

_Placeholder — add screenshots of the Dashboard, Patients, Appointments, Visits, and Invoices pages here._

<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

## Future Improvements

- Self-service "forgot password" flow and a "must change password on next login" flag; login rate limiting.
- Refresh tokens or sliding sessions.
- Frontend test suite (the backend xUnit integration suite exists; frontend tests are still future work).
- Payment corrections/refund workflow.
- Automatic/scheduled appointment reminders (email/SMS/WhatsApp Business API) and reminder-sent tracking — today's WhatsApp reminders are manual, staff-triggered `wa.me` links only (see Known Limitations).
- Calendar Month view and drag-and-drop rescheduling (Day/Week calendar views exist today).
- Enforce clinic opening hours at booking time.
- Export reports to CSV/PDF.
