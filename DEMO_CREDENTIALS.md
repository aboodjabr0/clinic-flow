# ClinicFlow Demo Credentials

Fake accounts only — no real patient or clinic data. Valid on the live demo deployment:

- Frontend: https://iridescent-chebakia-b3ed11.netlify.app
- Backend: https://clinicflow-api-5moj.onrender.com

## Logins

| Role | Email | Password |
|---|---|---|
| Admin | `demo.admin@clinicflow.app` | `DemoAdmin@123!` |
| Doctor (Dr. Sarah Mitchell) | `doctor@clinicflow.local` | `Doctor@12345!` |
| Receptionist | `receptionist@clinicflow.local` | `Reception@12345!` |

The login page's on-screen hint (`admin@clinicflow.local` / `Admin@12345!`) is a **local-development-only** fallback and does not exist on this deployment — use the Admin row above instead.

## Notes

- The Doctor and Receptionist passwords above are still the local-dev fallback values (`SEED_DOCTOR_PASSWORD` / `SEED_RECEPTIONIST_PASSWORD` were never set on Render), so they're identical between local dev and this demo deployment. Only the Admin account has a demo-specific password, via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` on Render.
- Demo data (patients, appointments, visits, invoices) is seeded automatically and is entirely synthetic.
