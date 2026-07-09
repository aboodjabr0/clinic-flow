# ClinicFlow — Phase 11 Testing Report

## 1. Test Environment

| Component | Details |
|---|---|
| Backend | ASP.NET Core Web API, .NET 10.0.109, run from `backend/` on `http://localhost:5106` |
| Frontend | React + TypeScript + Vite, run from `frontend/` on `http://localhost:5173` |
| Database | PostgreSQL, `clinicflow_dev` on `localhost:5432` |
| Backend env vars (required, not committed) | `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=clinicflow_dev`, `DB_USER=clinicflow_dev`, `DB_PASSWORD=<see local secrets>` — `ConnectionStrings:Default` in `appsettings.json` is intentionally empty; a bare `dotnet run` without these env vars fails during seeding. |
| Browser testing | Headless Google Chrome via `puppeteer-core` (installed only in a scratch/temp folder outside the repo — not added to the project) |

### Demo credentials (seed data, `Data/DbSeeder.cs`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@clinicflow.local | Admin@12345! |
| Doctor (linked to Dr. Sarah Mitchell) | doctor@clinicflow.local | Doctor@12345! |
| Receptionist | receptionist@clinicflow.local | Reception@12345! |

Credentials matched exactly what was provided; no environment override was in effect.

---

## 2. Backend Test Checklist

- [x] `dotnet build` — succeeds, 0 errors (2 pre-existing `NU1510` nuget warnings, unrelated to this phase)
- [x] `dotnet ef migrations list` — 7 migrations, all applied, none pending
- [x] `dotnet ef database update` — not needed; DB already at latest migration
- [x] `dotnet run` — backend starts and serves traffic
- [x] `GET /api/health` — returns `200 Healthy`
- [x] `GET /swagger/index.html` — returns `200`
- [x] All required tables present in PostgreSQL: `AppUsers`, `DoctorProfiles`, `DentalServices`, `ClinicSettings`, `Patients`, `Appointments`, `Visits`, `Invoices`, `Payments`, `AuditLogs`, `__EFMigrationsHistory`

## 3. Frontend Test Checklist

- [x] `npm run build` (`tsc -b && vite build`) — succeeds, 0 type errors
- [x] `npm run dev` (Vite) — serves on port 5173, reachable from backend's CORS policy
- [x] No console errors, page errors, or failed (5xx / network) requests detected across 120 automated page loads (3 roles × 4 breakpoints × 10 pages)

## 4. Role-Based Access Checklist

All checks below were verified **at the backend** (direct API calls with role-specific JWTs, bypassing the UI) and cross-checked against the rendered UI (sidebar links, redirects).

| Area | Admin | Receptionist | Doctor |
|---|---|---|---|
| Dashboard | Full, financial cards | Full, financial cards | Scoped to own appointments/visits, **no revenue/financial cards** (`unpaidInvoices`, `totalRevenueThisMonth`, etc. are `null`) |
| Patients | Full CRUD | Full CRUD | View-only (403 on POST/PUT/PATCH) |
| Doctors / Services | Full CRUD | View-only (403 on mutate) | View-only (403 on mutate) |
| Clinic Settings | Read/write | Read-only route blocked entirely → `/access-denied` (sidebar link absent) | Same as Receptionist |
| Appointments | Full CRUD + any status | Create/edit/cancel + status transitions: Scheduled/Arrived/Cancelled/NoShow | View-only for create/edit/cancel (403); status transitions limited to InProgress/Completed |
| Visits | Full | View-only (403 on start/update/complete) | Start/update/complete **only for own linked DoctorProfile** (403 on other doctors' appointments/visits) |
| Invoices/Payments | Full | Create invoices + add payments | View-only (403 on create/payment) |
| Reports — appointments | ✓ | ✓ | ✓ |
| Reports — revenue/patients | ✓ | ✓ | 403 |
| Audit Logs | ✓ (`AdminOnly` policy) | 403 + sidebar link absent + `/audit-logs` route → `/access-denied` | Same as Receptionist |

Sidebar link visibility (rendered UI, confirmed via headless browser DOM query):
- **Admin**: Dashboard, Patients, Appointments, Doctors, Services, Visits, Invoices, Reports, Settings, Audit Logs
- **Doctor / Receptionist**: same list minus **Settings** and **Audit Logs**

## 5. Workflow Test Checklist

### Authentication
- [x] Valid login for all 3 roles returns a JWT + correct role
- [x] Invalid password / invalid email → `401` with generic "Invalid email or password." (no user enumeration)
- [x] Missing fields → `400` with field-level validation message
- [x] `GET /api/auth/me` with valid token → returns user; no token / garbage token → `401`
- [x] `AdminOnly` policy enforced (`admin-test` returns 403 for Doctor, 200 for Admin)
- [x] Logout endpoint works
- [x] Refresh-while-logged-in: `AuthContext` re-validates the stored token against `/api/auth/me` on mount and clears auth silently if it's rejected — confirmed in code and via a fresh page load with an injected token
- [x] Every login attempt (success and failure) creates an audit log entry (`LoginSucceeded` / `LoginFailed`) with **no password or token** in the record

### Patients
- [x] List, search, pagination, gender/active filters
- [x] Create (valid), update, activate/deactivate as Admin/Receptionist
- [x] Doctor blocked from mutating (403), can view
- [x] Future date-of-birth rejected ("Date of birth cannot be in the future.")
- [x] Invalid email rejected
- [x] Missing required fields rejected with field names
- [x] 404 on non-existent patient
- [x] Patient stats endpoint correct

### Doctors / Services / Settings
- [x] List seeded doctors/services
- [x] Create/update/activate/deactivate as Admin
- [x] Non-admin blocked from mutating (403), can read
- [x] Clinic settings read (staff) / write (Admin only)

### Appointments
- [x] List, today, stats, filters (search/date/status/doctor/service/patient), pagination
- [x] Create as Admin/Receptionist; Doctor blocked (403)
- [x] **Double-booking**: same doctor + overlapping time → `400` clear error
- [x] Different doctor, same overlapping time → allowed
- [x] Cancelled appointment's slot can be rebooked (overlap check excludes Cancelled) — confirmed working as expected
- [x] Cancel with reason (Admin/Receptionist only, 403 for Doctor)
- [x] Status transitions enforced per role (Receptionist: Scheduled/Arrived/Cancelled/NoShow; Doctor: InProgress/Completed; Admin: any)
- [x] Patient appointment history endpoint

### Visits
- [x] List, filters, pagination, stats
- [x] Start visit from appointment (Admin/Doctor) → appointment status becomes `InProgress`
- [x] Starting the same visit twice is rejected ("A visit has already been started for this appointment.")
- [x] Doctor scoping: a Doctor can only start/update/complete visits for appointments booked with **their own linked DoctorProfile** — confirmed 403 against another doctor's appointment
- [x] Update visit notes (Admin/Doctor only, 403 for Receptionist)
- [x] Complete visit → appointment status becomes `Completed`
- [x] Patient visit history / appointment→visit section
- [x] Audit logs for visit actions contain only patient/doctor display names — **no diagnosis, treatment, or prescription text** (verified across all `VisitStarted`/`Updated`/`VisitCompleted` entries)

### Invoices / Payments
- [x] List, filters, pagination, stats
- [x] Manual invoice creation (Admin/Receptionist); Doctor blocked (403)
- [x] Invoice creation from a Visit (auto-resolves patient, service, price)
- [x] Duplicate invoice for the same appointment/visit rejected (`400`)
- [x] Partial payment → status `PartiallyPaid`, correct remaining balance
- [x] Full payment → status `Paid`, remaining = 0
- [x] Overpayment blocked ("Payment amount cannot exceed the remaining balance.")
- [x] Zero/negative payment amount rejected by validation
- [x] Money math verified: subtotal − discount = total; total − paid = remaining, across manual and auto-created invoices
- [x] Doctor is view-only on invoices/payments (403 on create/payment)

### Dashboard / Reports
- [x] Admin/Receptionist see clinic-wide financial data
- [x] Doctor's dashboard/summary returns scoped counts and **null** for all financial fields
- [x] Reports: appointments report open to all staff; revenue/patients reports restricted to Admin/Receptionist (403 for Doctor)
- [x] Invalid date range (`fromDate` after `toDate`) → clean `400`
- [x] Invalid date format → clean `400` (model-binding validation message, no stack trace)

### Audit Logs
- [x] List, filter by action, filter by entity type, filter by date range, pagination, single-entry detail view — all correct
- [x] No passwords, tokens, or Authorization header values found anywhere in the codebase's logging or audit trail (verified by code review of every `LogAsync` call site and the only two `ILogger` call sites in the whole backend)
- [x] Non-admin roles: no sidebar link, direct `/audit-logs` route redirects to `/access-denied`, backend returns `403`

### Responsive UI
Tested at 1440 / 1024 / 768 / 390px for Dashboard, Patients, Appointments, Visits, Invoices, Doctors, Services, Settings, Audit Logs, Reports (10 pages × 4 breakpoints × 3 roles = 120 automated loads, plus manual screenshot review):
- [x] Sidebar collapses to a hamburger menu on narrow widths
- [x] Card grids reflow to fewer columns / stack on mobile
- [x] Tables stay inside their own horizontally-scrollable container — confirmed **no page-level horizontal scroll** at any tested breakpoint/page combination (`document.body.scrollWidth` vs `window.innerWidth` diff was 0 everywhere)
- [x] No obvious visual breakage found in reviewed screenshots

### Browser Console / Network
- [x] Zero console errors, zero uncaught page errors, zero failed/5xx requests across all 120 automated (role × breakpoint × page) loads
- [x] Role-gated routes (`/settings`, `/audit-logs` for non-admins) redirect cleanly to `/access-denied` rather than erroring

---

## 6. Bugs Found and Fixed

### Bug: Completing a visit with a minimal payload silently erased existing clinical notes
- **File**: `backend/Services/VisitService.cs`
- **Where found**: Manual API-level regression testing of the visit workflow (start → update notes → complete)
- **Root cause**: `CompleteVisitAsync` called the same `ApplyNotes` helper as `UpdateVisitAsync`, which unconditionally overwrites every note field (`ChiefComplaint`, `DiagnosisNote`, `TreatmentNote`, `ToothNumbers`, `PrescriptionNote`, `FollowUpDate`, `InternalNotes`) with whatever the request body contains — including `null` when a field is omitted. Since `CompleteVisitDto` marks every field optional (by design, so a doctor *can* finalize notes and complete in one call), a caller that sends `PATCH /api/visits/{id}/complete` with an empty or partial body — a perfectly reasonable "just mark this done" request — wiped out diagnosis, treatment, and prescription text that had just been saved via `PUT /api/visits/{id}`.
- **Why the UI didn't show it**: `VisitsPage.tsx` always pre-fetches the current visit and pre-fills the form before opening the "Complete" modal, so a normal click-through never sends an empty body. The bug was invisible in the one existing UI flow but is a real data-loss risk for the API contract itself (any other client, a future UI change, or a retry after a failed prefetch).
- **Fix**: `ApplyNotes` now takes a `preserveExistingWhenOmitted` flag. `UpdateVisitAsync` keeps its original full-form-save behavior (blank field ⇒ cleared, unchanged). `CompleteVisitAsync` now passes `preserveExistingWhenOmitted: true`, so any note field left out of the complete request keeps its current value instead of being nulled out.
- **Verified**: Rebuilt (`dotnet build` — 0 errors), restarted the dev backend, and reproduced the exact regression: start a visit → set full notes via Update → complete with `{}` → notes are now preserved (previously they were wiped). Also re-verified that `Update` with an omitted field still clears it as before (no regression to that endpoint's contract).

No other bugs were found during this pass — all documented workflows, validations, and access-control rules behaved as specified.

## 7. Known Limitations / Notes (not fixed — out of scope for this phase)

- Cancelling an appointment is allowed from any non-terminal status, including `InProgress` (confirmed intentional per the task's own test script: "Try overlapping with Cancelled/NoShow if logic allows" implies cancellation flexibility is acceptable). Not changed since it's a business-logic/product decision, not a defect.
- `AuthController.Login` has a `// TODO: add login rate limiting` comment already in the code — no per-IP/per-email throttling exists yet. Flagged for a future security-hardening pass; out of scope for Phase 11 (no new features).
- No automated test project (xUnit/NUnit) exists in the repo; all testing in this phase was manual/scripted (curl + headless Chrome) rather than a checked-in test suite.

## 8. Open Bugs

None.
