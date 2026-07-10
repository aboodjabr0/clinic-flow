# CLAUDE.md — ClinicFlow Project Guide

## Project Overview

ClinicFlow is a full-stack dental clinic management system built for small dental clinics.

The goal is to create a clean, realistic, production-style MVP that can be used by:
- Admins
- Doctors
- Receptionists

This is not a hospital system. It is a focused dental clinic operations system.

The system will manage:
- Authentication and role-based access
- Patients
- Doctors
- Appointments
- Dental visits
- Simple prescriptions
- Services
- Invoices
- Payments
- Dashboard analytics
- Audit logs

The project should be built phase by phase. Do not implement all features at once.

---

## Final Project Decisions

- App name: ClinicFlow
- Clinic type: Dental clinic
- Doctors: Multiple doctors
- Language: UI supports English and Arabic. Arabic uses a right-to-left (RTL) layout. New frontend features must use the i18n translation system (`frontend/src/i18n/`) — do not hardcode visible UI strings directly in pages/components.
- Frontend: React + TypeScript
- Backend: ASP.NET Core Web API
- Database: PostgreSQL
- Authentication: JWT
- Development approach: Local first
- Design style: Clean, modern medical dashboard
- Prescriptions: Simple text prescriptions only
- Invoices/payments: Included
- Medical AI/diagnosis: Not allowed

---

## Important Product Rule

Do not build features that provide diagnosis, treatment recommendations, medical advice, or AI-based clinical suggestions.

This app is for clinic operations only:
- scheduling
- patient records
- visit notes
- prescriptions written manually by doctors
- invoices
- payments
- reports

Use fake/demo patient data only during development.

---

## Development Philosophy

Build this like a real professional project.

Priorities:

1. Clean architecture
2. Maintainable code
3. Small focused files
4. Clear naming
5. Strong validation
6. Role-based access
7. Secure handling of sensitive data
8. Responsive UI
9. Realistic clinic workflow
10. Easy future deployment

Avoid:
- messy code
- giant components
- duplicated logic
- unnecessary libraries
- fake complex features
- building future phases too early
- adding features not requested in the current phase

---

## Tech Stack

### Frontend

Use:

- React
- TypeScript
- React Router
- Native fetch API
- CSS or modular CSS
- Vite

Do not use unless requested:
- Redux
- Zustand
- React Query
- Axios
- Material UI
- Bootstrap

Frontend should stay simple and understandable.

### Backend

Use:

- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- JWT authentication
- Swagger/OpenAPI
- CORS for local frontend
- Middleware for error handling

### Database

Use:

- PostgreSQL
- Entity Framework Core migrations
- Clean entity relationships
- Seed data only when useful

---

## Suggested Frontend Structure

```txt
src/
  api/
    apiClient.ts

  components/
    common/
      Button.tsx
      Input.tsx
      Card.tsx
      PageHeader.tsx
      EmptyState.tsx
      LoadingState.tsx
      StatusBadge.tsx

    layout/
      DashboardLayout.tsx
      Sidebar.tsx
      Topbar.tsx

  context/
    AuthContext.tsx

  pages/
    Login/
      LoginPage.tsx

    Dashboard/
      DashboardPage.tsx

    Patients/
      PatientsPage.tsx
      PatientDetailsPage.tsx

    Appointments/
      AppointmentsPage.tsx

    Doctors/
      DoctorsPage.tsx

    Visits/
      VisitsPage.tsx

    Invoices/
      InvoicesPage.tsx

    Settings/
      SettingsPage.tsx

  routes/
    AppRoutes.tsx
    ProtectedRoute.tsx

  styles/
    globals.css
    theme.css

  types/
    auth.ts
    patient.ts
    appointment.ts
    doctor.ts
    visit.ts
    invoice.ts

  utils/