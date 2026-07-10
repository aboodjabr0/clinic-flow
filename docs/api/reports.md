# Reports

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Simple JSON reports over a date range. When `fromDate`/`toDate` are omitted, the range defaults to the current month. All reports echo the applied range back in the response.

Role summary: the appointment report is available to all staff (Doctors see only their own appointments — any `doctorId` filter a Doctor sends is ignored). The revenue and patient reports are Admin/Receptionist only.

## GET /api/reports/appointments

Description:
Appointments within a date range with per-row operational data (no clinical notes or reasons) and summary counts.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist. Doctor results are always scoped to their own linked doctor profile; a Doctor with no linked profile gets an empty report.

Query parameters:
- `fromDate` / `toDate`: optional `yyyy-MM-dd`, default to the current month. `fromDate` must not be after `toDate`.
- `doctorId`: optional GUID — ignored for Doctor logins.
- `status`: optional appointment status filter.

Success status code: `200 OK` — `ApiResponse<AppointmentReportDto>`.

Example request:

```bash
curl "http://localhost:5106/api/reports/appointments?fromDate=2026-07-01&toDate=2026-07-31&status=Completed" \
  -H "Authorization: Bearer $TOKEN"
```

Example response:

```json
{
  "success": true,
  "data": {
    "fromDate": "2026-07-01",
    "toDate": "2026-07-31",
    "totalCount": 31,
    "completedCount": 24,
    "cancelledOrNoShowCount": 4,
    "rows": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "appointmentDate": "2026-07-10",
        "startTime": "09:00",
        "endTime": "09:45",
        "patientFullName": "John Smith",
        "doctorFullName": "Dr. Sarah Mitchell",
        "serviceName": "Teeth Cleaning",
        "status": "Completed"
      }
    ]
  },
  "message": null
}
```

Error status codes:
- `400 Bad Request` — invalid date range or "Invalid status filter."
- `401 Unauthorized`, `403 Forbidden`.

## GET /api/reports/revenue

Description:
Invoice/payment summary for a date range: invoice count, total invoiced, total paid, total outstanding, and one row per invoice issued within the range.

Auth:
Required.

Allowed roles:
Admin, Receptionist only. **Doctors get `403`.**

Query parameters:
- `fromDate` / `toDate`: optional `yyyy-MM-dd`, default to the current month.

Success status code: `200 OK` — `ApiResponse<RevenueReportDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "fromDate": "2026-07-01",
    "toDate": "2026-07-31",
    "invoiceCount": 22,
    "totalInvoiced": 2070.00,
    "totalPaid": 1830.00,
    "totalOutstanding": 240.00,
    "rows": [
      {
        "invoiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "invoiceNumber": "INV-2026-0042",
        "issueDate": "2026-07-10",
        "patientFullName": "John Smith",
        "serviceName": "Teeth Cleaning",
        "totalAmount": 45.00,
        "paidAmount": 45.00,
        "remainingAmount": 0.00,
        "status": "Paid"
      }
    ]
  },
  "message": null
}
```

Error status codes:
- `400` — invalid date range.
- `401`, `403` (Doctor).

Notes/business rules:
- Totals are computed over invoices *issued* within the range (not payments received within it).

## GET /api/reports/patients

Description:
Patients registered within a date range. Contact/registration data only — medical notes and allergies never appear in reports.

Auth:
Required.

Allowed roles:
Admin, Receptionist only. **Doctors get `403`.**

Query parameters:
- `fromDate` / `toDate`: optional `yyyy-MM-dd`, default to the current month.
- `isActive`: optional boolean.

Success status code: `200 OK` — `ApiResponse<PatientReportDto>` — `fromDate`, `toDate`, `totalCount`, `activeCount`, `rows` (id, full name, phone, gender, active flag, registered date).

Error status codes:
- `400` — invalid date range.
- `401`, `403` (Doctor).
