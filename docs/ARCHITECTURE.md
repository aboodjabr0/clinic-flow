# ClinicFlow Architecture

## High-Level Architecture

```txt
+---------------------+        HTTPS/JSON         +----------------------------+
|  React + TypeScript |  ── fetch, JWT bearer ──> |  ASP.NET Core Web API      |
|  (Vite, port 5173)  | <──  ApiResponse<T>  ───  |  (port 5106 local)         |
+---------------------+                           |                            |
                                                  |  Controllers               |
                                                  |    └─ Services (logic)     |
                                                  |         └─ EF Core         |
                                                  +------------|---------------+
                                                               |
                                                        +------v------+
                                                        | PostgreSQL  |
                                                        +-------------+
```

Three layers, one repository:

- **frontend/** — React SPA. Owns presentation, routing, and client-side state. Talks to the API with the native `fetch` wrapper in `src/api/apiClient.ts`. All role checks in the UI are purely cosmetic (hide links, redirect routes) — never authoritative.
- **backend/** — ASP.NET Core Web API. Owns all business rules, validation, authorization, and audit logging. Thin controllers delegate to interface-backed services.
- **PostgreSQL** — single database, schema managed exclusively by EF Core migrations.

## Backend Folder Structure

```txt
backend/
  Program.cs            Composition root: DI, CORS, JWT auth, policies,
                        Swagger, error middleware, startup migrations/seeding
  Controllers/          One controller per module; routing + status codes only
  Services/             Business logic; one interface + implementation per module
  Data/
    AppDbContext.cs     EF Core context (all DbSets, model config)
    DbSeeder.cs         Idempotent demo/dev seeding
  Entities/             EF entities + enums (UserRole, AppointmentStatus, ...)
  DTOs/                 Request/response contracts, grouped per module
  Common/               ApiResponse/ErrorResponse envelopes, JwtSettings,
                        JwtKeyResolver, AuditConstants
  Middleware/           ErrorHandlingMiddleware (global exception -> safe 500)
  Migrations/           EF Core migrations (7 as of this writing)
  Dockerfile            Multi-stage build for deployment (listens on 8080)
```

## Frontend Folder Structure

```txt
frontend/src/
  api/                  apiClient.ts (fetch wrapper: base URL, JWT header,
                        envelope unwrapping) + one thin API module per backend
                        module (patientsApi.ts, invoicesApi.ts, ...)
  components/
    common/             Button, Input, Select, Textarea, Card, Modal,
                        PageHeader, Pagination, StatusBadge, EmptyState,
                        LoadingState (each with its own CSS file)
    layout/             DashboardLayout, Sidebar, Topbar
    dashboard/, invoices/   Feature-specific components
  context/              AuthContext (token + user, persisted, re-validated via
                        /api/auth/me), ThemeContext (light/dark)
  pages/                One folder per screen (Dashboard, Patients, ...)
  routes/               AppRoutes (route table), ProtectedRoute (auth + role
                        guard, redirects to /login or /access-denied)
  styles/               globals.css, theme.css (design tokens)
  types/                TypeScript mirrors of the backend DTOs
  utils/                Per-module display/format helpers
```

## Data Flow

A typical request (e.g. receptionist records a payment):

1. Page component calls the module API function (`invoicesApi.addPayment(...)`).
2. `apiClient.ts` attaches `Authorization: Bearer <token>`, sends JSON to `VITE_API_URL`, and unwraps the `{ success, data, message }` envelope (or throws with the error `message`).
3. The controller validates the DTO (data annotations; invalid model state returns a `400` `ErrorResponse` with the first message) and checks the authorization policy.
4. The service applies business rules (e.g. "payment cannot exceed remaining balance"), mutates entities via `AppDbContext`, writes an audit entry, and returns a DTO.
5. The controller wraps it in `ApiResponse<T>.Ok(...)` and returns `200`.

Services return `(result, error)` tuples (plus `notFound`/`forbidden` flags where relevant) instead of throwing for expected business failures; exceptions are reserved for the unexpected and become a generic `500` in `ErrorHandlingMiddleware`.

## Auth Flow

1. `POST /api/auth/login` verifies the password against the stored hash (`PasswordHasher<AppUser>`) and, for active accounts, issues a signed JWT (HMAC-SHA256) with subject (user id), name, email, and role claims. Success and failure are both audit-logged.
2. The frontend stores the token and user in `AuthContext` (persisted), and re-validates on page load via `GET /api/auth/me` — if rejected, auth state is cleared silently.
3. Every protected request carries `Authorization: Bearer <token>`. The JWT middleware validates issuer, audience, lifetime (±1 min clock skew), and signature.
4. The signing key comes from `Jwt__Key` via `JwtKeyResolver`; in Development only, a hardcoded dev fallback key is used, and outside Development a missing key fails startup.
5. Logout is client-side (token discarded); tokens are not revocable and expire after `Jwt__ExpiresMinutes` (default 60).

## Role-Based Access Model

Roles: `Admin`, `Doctor`, `Receptionist` (enum on `AppUser`, carried as a JWT role claim). Policies defined in `Program.cs`:

| Policy | Roles | Typical use |
|---|---|---|
| `StaffOnly` | all three | controller-level default for every module |
| `AdminOnly` | Admin | doctors/services/settings mutations, audit logs |
| `AdminOrReceptionist` | Admin, Receptionist | patients/appointments/invoices mutations, financial data |
| `AdminOrDoctor` | Admin, Doctor | visit start/update/complete |

Beyond policies, two finer-grained rules are enforced in code:

- **Appointment status transitions** — `AppointmentsController` restricts which statuses each role may set (Receptionist: Scheduled/Arrived/Cancelled/NoShow; Doctor: InProgress/Completed; Admin: any).
- **Doctor ownership scoping** — for Doctor logins, the controllers resolve the caller's linked `DoctorProfile` from the JWT subject. Visits: mutations on another doctor's visit return `403` (a Doctor with no linked profile is rejected outright). Dashboard/Reports: data is filtered to that profile, financial fields are nulled/omitted, and a Doctor with no linked profile gets *empty* data rather than clinic-wide data.

The frontend mirrors these rules (sidebar visibility, `ProtectedRoute` role guards) for UX only.

## Database Modules

All ids are GUIDs; timestamps are UTC. Tables (one EF entity each):

| Table | Purpose | Key relationships |
|---|---|---|
| `AppUsers` | Login accounts (email, password hash, role, active flag) | ← `DoctorProfiles.AppUserId` (optional 1:1) |
| `DoctorProfiles` | Doctor directory data | → optional `AppUser` |
| `DentalServices` | Service catalog (price, duration) | referenced by appointments/invoices |
| `ClinicSettings` | Single clinic settings row | — |
| `Patients` | Patient records incl. medical notes/allergies | — |
| `Appointments` | Booking: patient + doctor + service + date/times + status + price snapshot | → Patient, DoctorProfile, DentalService |
| `Visits` | Clinical record, 1:1 with appointment (notes, prescription, follow-up) | → Appointment (unique), denormalized patient/doctor refs |
| `Invoices` | Billing (subtotal/discount/total/paid/remaining, status, unique per appointment/visit) | → Patient, optional Appointment/Visit/DentalService |
| `Payments` | Individual payments against an invoice | → Invoice, optional recording AppUser |
| `AuditLogs` | Append-only audit trail | optional → AppUser |

Soft-state pattern: patients, doctors, and services are activated/deactivated (`IsActive`) — nothing is hard-deleted.

## Service Layer Pattern

Each module has an interface (`IPatientService`) and implementation (`PatientService`) registered scoped in `Program.cs`. Conventions:

- Controllers never touch `AppDbContext`; services never format HTTP responses.
- Expected failures return `(null, "message")` tuples → controllers map them to `400`/`404`/`409`.
- List queries use projected DTOs (`Select` into list-item DTOs) with pagination clamped to a max page size of 100.
- Cross-cutting services: `ICurrentUserService` (caller identity from the HTTP context), `IAuditLogService` (audit writes), `IJwtTokenService` (token issuing).

## DTO Usage

- Every endpoint has explicit request/response DTOs — entities are never serialized directly, which prevents mass assignment and accidental exposure (e.g. `AuthUserDto` exists so `PasswordHash` can never leak).
- Request DTOs carry data-annotation validation (`[Required]`, `[StringLength]`, `[Range]`, `[EmailAddress]`, `[EnumDataType]`); a custom `InvalidModelStateResponseFactory` converts failures into the standard `ErrorResponse`.
- List vs. detail split: list-item DTOs omit heavy/sensitive text (e.g. `PatientListItemDto` has no medical notes; dashboard rows have no clinical text).
- Update DTOs often inherit create DTOs (`UpdatePatientDto : CreatePatientDto`) for full-replacement semantics; the visit-complete DTO intentionally *preserves* omitted fields instead (see `docs/api/visits.md`).

## Audit Logging Approach

- `AuditLogService.LogAsync` is called inside service methods after successful mutations (and on login attempts). Entries record: user id/email/name/role, action, entity type/id, a display name, a human-readable summary, IP address, and user agent.
- Actions/entity types are plain-string constants (`Common/AuditConstants.cs`) so new ones need no migration.
- Privacy rules: no clinical text (diagnosis/treatment/prescription), no passwords, no tokens — visit audit entries contain display names only.
- Read access is Admin-only (`/api/audit-logs`); there are no write/delete endpoints.

## Demo Seeding Approach

`Data/DbSeeder.cs` runs at startup when the environment is Development or `ENABLE_DEMO_SEEDING=true`. It is idempotent (checks before inserting) and seeds, in order: the admin account (email/name/password overridable via `SEED_ADMIN_*` env vars), doctor + receptionist accounts and doctor profiles (`SEED_DOCTOR_PASSWORD` / `SEED_RECEPTIONIST_PASSWORD` overrides), the service catalog and clinic settings, then demo patients, appointments, visits, and invoices. All seeded data is synthetic. Dev fallback passwords are compile-time constants used only when the env overrides are absent.

## Error Handling Approach

Three layers, all producing the same `ErrorResponse` envelope (`{ success: false, message, traceId }`):

1. **Model validation** — invalid DTOs short-circuit to `400` with the first validation message (custom factory in `Program.cs`).
2. **Business rules** — services return error strings; controllers map them to `400`/`404`/`409` with safe, user-readable messages.
3. **Unhandled exceptions** — `ErrorHandlingMiddleware` logs the full exception server-side and returns a generic `500` ("An unexpected error occurred…") with a `traceId` for correlation. Exception details, stack traces, and internal messages never reach the client.
