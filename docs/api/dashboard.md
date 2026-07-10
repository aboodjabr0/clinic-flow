# Dashboard

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Read-only aggregations for the dashboard page. Two scoping rules apply throughout:

1. **Doctor scoping** — for Doctor logins, appointment/visit data is filtered to their own linked `DoctorProfile`. A Doctor login with *no* linked profile gets empty data (the scope resolves to an id that matches no rows) rather than clinic-wide data. Admin and Receptionist always see clinic-wide data.
2. **Financial visibility** — revenue/invoice data is limited to Admin and Receptionist. Doctors get `null` financial fields on the summary, an empty `recentInvoices` list, and `403` on the revenue endpoint.

## GET /api/dashboard/summary

Description:
Headline numbers: patient counts, today/scheduled/completed appointment counts, visit counts, and (for Admin/Receptionist) invoice counts, revenue this month, and outstanding balance.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<DashboardSummaryDto>`.

Example response (Admin/Receptionist):

```json
{
  "success": true,
  "data": {
    "totalPatients": 42,
    "activePatients": 40,
    "newPatientsThisMonth": 5,
    "todayAppointments": 6,
    "scheduledAppointments": 18,
    "completedAppointmentsThisMonth": 31,
    "inProgressVisits": 1,
    "completedVisitsThisMonth": 29,
    "unpaidInvoices": 8,
    "partiallyPaidInvoices": 5,
    "paidInvoicesThisMonth": 22,
    "totalRevenueThisMonth": 1830.00,
    "outstandingBalance": 640.00
  },
  "message": null
}
```

For Doctor logins, the five financial fields (`unpaidInvoices`, `partiallyPaidInvoices`, `paidInvoicesThisMonth`, `totalRevenueThisMonth`, `outstandingBalance`) are `null`, and appointment/visit counts are scoped to that doctor.

Error status codes: `401`, `403`.

## GET /api/dashboard/today

Description:
Today's clinic activity: per-status counts plus the full appointment schedule for today (doctor-scoped for Doctors).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<TodayClinicDto>` — `date`, `totalAppointments`, `arrived`, `inProgress`, `completedToday`, `cancelledOrNoShowToday`, `appointments` (compact rows: patient, doctor, service, times, status — no reason/notes).

Error status codes: `401`, `403`.

## GET /api/dashboard/revenue

Description:
Financial dashboard: current-month revenue and outstanding amounts, all-time paid/unpaid totals, recent paid invoices, and a 6-month monthly revenue series (oldest first). "Revenue" means payments actually received; outstanding amounts come from invoice remaining balances.

Auth:
Required.

Allowed roles:
Admin, Receptionist only. **Doctors get `403`.**

Success status code: `200 OK` — `ApiResponse<DashboardRevenueDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "currentMonthRevenue": 1830.00,
    "currentMonthOutstanding": 240.00,
    "totalPaidAmount": 4820.00,
    "totalUnpaidAmount": 640.00,
    "recentPaidInvoices": [],
    "monthlyRevenue": [
      { "year": 2026, "month": 2, "label": "Feb 2026", "totalPaid": 610.00 },
      { "year": 2026, "month": 3, "label": "Mar 2026", "totalPaid": 780.00 }
    ]
  },
  "message": null
}
```

Error status codes: `401`, `403` (Doctor).

## GET /api/dashboard/appointments/status-breakdown

Description:
All-time appointment counts by status (doctor-scoped for Doctors). Used for the dashboard status chart.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<AppointmentStatusBreakdownDto>` — `scheduled`, `arrived`, `inProgress`, `completed`, `cancelled`, `noShow`.

Error status codes: `401`, `403`.

## GET /api/dashboard/recent-activity

Description:
Latest records across the clinic: recent appointments, recent visits, and recent invoices. Doctor-scoped for Doctors, whose `recentInvoices` list is always empty (financial visibility rule). Dashboard rows deliberately exclude clinical notes and appointment reasons.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<RecentActivityDto>` — `recentAppointments`, `recentVisits`, `recentInvoices`.

Error status codes: `401`, `403`.

## GET /api/dashboard/follow-ups

Description:
Upcoming follow-ups: visits with a follow-up date from today onward (doctor-scoped for Doctors). Includes the patient's phone number so reception can call to book.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Success status code: `200 OK` — `ApiResponse<UpcomingFollowUpDto[]>` — each row: `visitId`, `patientId`, `patientFullName`, `patientPhoneNumber`, `doctorFullName`, `followUpDate`.

Error status codes: `401`, `403`.
