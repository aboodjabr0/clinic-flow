# ClinicFlow User Guide

How each role uses ClinicFlow day to day. All demo logins and data are fake; see the README for demo credentials.

Signing in: open the app, enter your email and password. Sessions last 60 minutes by default; after expiry you are returned to the login page. The sidebar only shows the pages your role can use, and the backend independently enforces the same permissions.

**Language:** ClinicFlow is available in English and Arabic. Switch languages with the **EN / عربي** toggle in the topbar — available to every role. Arabic switches the whole layout to right-to-left (RTL); English stays left-to-right. Your choice is remembered in the browser (`localStorage`) and applies immediately, without a page reload.

## Roles at a Glance

| Page | Admin | Receptionist | Doctor |
|---|---|---|---|
| Dashboard | full, incl. revenue | full, incl. revenue | own schedule only, no revenue |
| Patients | manage | manage | view |
| Appointments | manage | manage | view + run own |
| Doctors | manage | view | view |
| Services | manage | view | view |
| Visits | full | view | own visits |
| Invoices | manage | manage | view |
| Reports | all three | all three | appointments only (own) |
| Settings | edit | — | — |
| Audit Logs | view | — | — |
| Users | manage | — | — |

---

## Admin

The Admin sees and manages everything.

**Dashboard** — clinic-wide headline stats (patients, today's appointments, visits, unpaid invoices), today's schedule, appointment status breakdown, recent activity, upcoming follow-ups, and revenue cards with a 6-month revenue chart.

**Managing Staff Users** — the User Management page (`/users`) is where Admins create and maintain staff login accounts (Admin, Doctor, Receptionist):

- **Create a user** — full name, email, password, and role. If the role is Doctor, you can optionally link an existing doctor profile right away (or leave it unlinked and link it later) — this is what scopes that doctor's visits and dashboard to their own appointments.
- **Edit a user** — update name, email, role, or their linked doctor profile.
- **Activate/Deactivate** — deactivated accounts cannot log in. The clinic can never be left with zero active Admins — the app blocks any change that would remove the last one, including an Admin deactivating themselves.
- **Reset password** — set a new password for a staff member (e.g. after they forget theirs); the old password stops working immediately.

Every create, edit, activate/deactivate, and password reset is recorded in the Audit Logs — passwords themselves are never shown or logged anywhere.

**Demo accounts** — the seeded demo logins (`admin@clinicflow.local`, etc.) exist for local development and demos only. Real clinics should create their own staff accounts through this page and disable demo seeding in production by setting `ENABLE_DEMO_SEEDING=false`.

**Doctors** — add and edit doctor profiles (name, email, phone, specialty, license, bio), link a profile to an existing Doctor login account (this link is what scopes that doctor's visits and dashboard), and activate/deactivate doctors.

**Services** — maintain the dental service catalog: name, description, default price, and duration. Prices are copied to appointments/invoices at booking time, so editing a price never changes past records. Deactivate a service to retire it.

**Settings** — clinic name, contact details, opening hours, and default currency. Admin-only; other roles can see but not edit these values.

**Patients** — everything a receptionist can do (below).

**Appointments** — everything a receptionist can do, plus set *any* appointment status directly.

**Visits** — view all visits, and start/update/complete any visit regardless of doctor (useful for corrections).

**Invoices** — everything a receptionist can do.

**Reports** — all three reports: appointments, revenue, and patient registrations, each over a selectable date range.

**Audit Logs** — Admin-only trail of who did what: logins (including failures), record creation/edits, status changes, cancellations, visit start/complete, invoices, payments, and settings changes. Filter by user, action, entity type, date range, or search. Entries never contain clinical notes or passwords.

---

## Receptionist

The Receptionist runs the front desk: patients, scheduling, and money.

**Patients** — register new patients (name, phone, gender required; email, date of birth, address, emergency contact, medical notes, and allergies optional), search and filter the list, edit records, and deactivate patients who leave the practice. The patient detail page shows their appointment, visit, and invoice history.

**Appointments** — book appointments by choosing patient, doctor, service, date, and time. The system blocks double-booking a doctor and past-dated bookings; a cancelled slot can be rebooked. Day to day: mark patients **Arrived** when they check in, mark **NoShow**, reschedule, and cancel with a reason. (Moving an appointment to In Progress/Completed happens through the doctor's visit workflow.)

**Invoices & payments** — create invoices, usually from a completed visit (patient, service, and price fill in automatically); apply a discount (only until the first payment is recorded); set a due date. Record payments (cash, card, bank transfer, CliQ, other) — partial payments are supported, overpayment is blocked, and the invoice status updates automatically (Unpaid → PartiallyPaid → Paid).

**Reports** — appointment, revenue, and patient reports over any date range.

**View doctors & services** — read-only directory of doctors and the service price list (for scheduling and quoting).

**View visits** — read-only visit list and details, including follow-up dates. The dashboard's *Upcoming follow-ups* list includes patient phone numbers so reception can call to book the next appointment.

Not available to receptionists: editing doctors/services, clinic settings, audit logs, and starting/editing visits.

---

## Doctor

The Doctor's view is scoped: their dashboard, visits, and reports cover only appointments booked with **their own** doctor profile, and no financial data is shown anywhere.

**Dashboard** — own headline stats (today's appointments, scheduled, visits in progress, completed this month), own today-schedule, status breakdown, recent activity, and upcoming follow-ups. No revenue or invoice cards.

**Patients** — view the full patient list and each patient's record, including medical notes, allergies, and their appointment/visit history. Doctors cannot create or edit patient records — ask reception.

**Appointments** — view the schedule. Doctors don't book or cancel; they act on appointments through visits.

**Visits (start → notes → complete)** — the core doctor workflow:

1. **Start visit** on a scheduled/arrived appointment (optionally noting the chief complaint). The appointment moves to *In Progress*. Only the doctor the appointment was booked with (or an Admin) can start it.
2. **Write notes** — diagnosis note, treatment note, tooth numbers, a plain-text **prescription**, an optional follow-up date, and internal notes. Saving the form replaces all fields with what's on screen.
3. **Complete visit** — marks the visit and appointment *Completed*. Notes can be finalized in the same step; anything left untouched is preserved. Notes on a completed visit can still be edited afterwards.

Prescriptions are simple free-text notes written by the doctor — ClinicFlow provides no diagnosis or treatment suggestions of any kind.

**Invoices (view only)** — doctors can open a patient's or visit's invoice to see billing status, but cannot create invoices or record payments.

**Restricted financial visibility** — by design, Doctor logins get no revenue dashboard, no revenue/patient reports (the appointments report is available, limited to their own appointments), and null financial fields on the dashboard summary. This is enforced by the backend, not just hidden in the UI.
