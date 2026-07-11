# Invoices & Payments

> Part of the ClinicFlow API reference. Shared conventions (auth header, response envelopes, pagination, error format) are described in [../API.md](../API.md).

Invoices bill a patient, optionally linked to an appointment and/or visit and a dental service. Payments are recorded against an invoice; the invoice's `paidAmount`, `remainingAmount`, and `status` are derived from its payments.

Money model: `subtotalAmount − discountAmount = totalAmount`; `totalAmount − paidAmount = remainingAmount`.

Invoice statuses (`PaymentStatus`): `Unpaid`, `PartiallyPaid`, `Paid`, `Refunded` (Refunded exists for manual bookkeeping only — no refund endpoint exists).

Payment methods: `Cash`, `Card`, `BankTransfer`, `CliQ`, `Other`.

Invoice numbers are auto-generated as `INV-{year}-{sequence}` (e.g. `INV-2026-0042`).

Role summary: all staff can **view** invoices; only Admin and Receptionist can create invoices, edit them, or record payments. Doctors are view-only.

## GET /api/invoices

Description:
Returns a paginated, filterable list of invoices.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Query parameters:
- `search`: optional string — matches invoice number or patient name/phone.
- `patientId`, `appointmentId`, `visitId`: optional GUIDs.
- `status`: optional — `Unpaid`, `PartiallyPaid`, `Paid`, `Refunded`.
- `fromDate` / `toDate`: optional `yyyy-MM-dd` (issue date range).
- `pageNumber`: optional int, default 1.
- `pageSize`: optional int, default 10, max 100.

Success status code: `200 OK` — `ApiResponse<PaginatedResponse<InvoiceListItemDto>>`.

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "invoiceNumber": "INV-2026-0042",
        "patientId": "8b7d2f10-1111-4562-b3fc-2c963f66afa6",
        "patientFullName": "John Smith",
        "patientPhoneNumber": "+1-555-0134",
        "appointmentId": "9c8e3a21-2222-4562-b3fc-2c963f66afa6",
        "visitId": "1d9f4b32-3333-4562-b3fc-2c963f66afa6",
        "serviceName": "Teeth Cleaning",
        "issueDate": "2026-07-10",
        "dueDate": "2026-07-24",
        "totalAmount": 45.00,
        "paidAmount": 20.00,
        "remainingAmount": 25.00,
        "status": "PartiallyPaid"
      }
    ],
    "pageNumber": 1,
    "pageSize": 10,
    "totalCount": 1,
    "totalPages": 1
  },
  "message": null
}
```

Error status codes:
- `400 Bad Request` — "Invalid status filter."
- `401 Unauthorized`, `403 Forbidden`.

## GET /api/invoices/stats

Description:
Returns invoice counts, total revenue (sum of paid amounts), and outstanding balance for the Invoices page cards.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist. (Note: this stats endpoint is staff-wide; the role-scoped financial hiding applies to the dashboard endpoints, not here.)

Success status code: `200 OK` — `ApiResponse<InvoiceStatsDto>`.

Example response:

```json
{
  "success": true,
  "data": {
    "totalInvoices": 60,
    "unpaidInvoices": 8,
    "partiallyPaidInvoices": 5,
    "paidInvoices": 47,
    "totalRevenue": 4820.00,
    "outstandingBalance": 640.00
  },
  "message": null
}
```

Error status codes: `401`, `403`.

## GET /api/invoices/{id}

Description:
Returns the full invoice, including its payment history.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `id`: GUID of the invoice.

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` (includes `payments: PaymentDto[]`, each with amount, date, method, reference, notes, and the recording user's name; also includes `doctorFullName`, resolved from the linked visit's doctor, falling back to the linked appointment's doctor, or `null` if neither is linked).

Error status codes:
- `401`, `403`.
- `404 Not Found` — "Invoice not found."

Used by the frontend's printable invoice (`/invoices/:id/print`) and payment receipt (`/invoices/:invoiceId/payments/:paymentId/receipt`) pages — no separate print/PDF endpoint exists; those pages reuse this response plus `GET /api/clinic-settings` for the clinic header, and render browser-printable HTML (see [../USER_GUIDE.md](../USER_GUIDE.md)).

## GET /api/patients/{patientId}/invoices

Description:
Returns a patient's invoices (not paginated).

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `patientId`: GUID of the patient.

Success status code: `200 OK` — `ApiResponse<InvoiceListItemDto[]>`. Returns an empty list for an unknown patient id.

Error status codes: `401`, `403`.

## GET /api/appointments/{appointmentId}/invoice

Description:
Returns the invoice linked to an appointment, if any.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `appointmentId`: GUID of the appointment.

Success status code: `200 OK` — `ApiResponse<InvoiceDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "No invoice exists for this appointment."

## GET /api/visits/{visitId}/invoice

Description:
Returns the invoice linked to a visit, if any.

Auth:
Required.

Allowed roles:
Admin, Doctor, Receptionist.

Route parameters:
- `visitId`: GUID of the visit.

Success status code: `200 OK` — `ApiResponse<InvoiceDto>`.

Error status codes:
- `401`, `403`.
- `404 Not Found` — "No invoice exists for this visit."

## POST /api/invoices

Description:
Creates an invoice — either standalone for a patient, or linked to an appointment/visit (which auto-resolves the patient, service, and default price).

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Request body (`CreateInvoiceDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | GUID | conditional | may be omitted when `appointmentId` or `visitId` is provided — the patient is resolved from the linked record |
| `appointmentId` | GUID | no | links the invoice to an appointment |
| `visitId` | GUID | no | links the invoice to a visit |
| `dentalServiceId` | GUID | no | resolved from the appointment/visit when omitted |
| `subtotalAmount` | decimal | conditional | 0–99999999.99; may be omitted when a service can be resolved — defaults to the service's default price. Required when no service is linked |
| `discountAmount` | decimal | no | 0–99999999.99, defaults 0; cannot exceed subtotal |
| `dueDate` | date | no | `yyyy-MM-dd`, not before the issue date |
| `notes` | string | no | max 2000 |

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` with message "Invoice created".

Example request (invoice from a completed visit):

```bash
curl -X POST http://localhost:5106/api/invoices \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"visitId":"1d9f4b32-3333-4562-b3fc-2c963f66afa6","dueDate":"2026-07-24"}'
```

Error status codes:
- `400 Bad Request` — "Patient not found." / "Appointment not found." / "Visit not found." / "A patient is required when no appointment or visit is linked." / "The patient does not match the linked appointment or visit." / "The appointment does not match the linked visit." / "An invoice already exists for this appointment." / "An invoice already exists for this visit." / "Dental service not found." / "A subtotal amount is required when no service is linked." / "Discount cannot be negative." / "Discount cannot exceed the subtotal amount." / "Due date cannot be before the issue date."
- `401`, `403`.

Notes/business rules:
- At most one invoice per appointment and one per visit.
- The issue date is set to today (server date) at creation.
- The action is audit-logged (`InvoiceCreated`).

## PUT /api/invoices/{id}

Description:
Updates an invoice's editable fields. `notes` and `dueDate` are always updatable; `discountAmount` may only change while the invoice has **no recorded payments**. Pass `null`/omit `discountAmount` to leave it unchanged.

Auth:
Required.

Allowed roles:
Admin, Receptionist.

Route parameters:
- `id`: GUID of the invoice.

Request body (`UpdateInvoiceDto`):

```json
{ "discountAmount": 5.00, "dueDate": "2026-07-31", "notes": "Loyalty discount applied" }
```

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` with message "Invoice updated".

Error status codes:
- `400 Bad Request` — "The discount cannot be changed after payments have been recorded." / "Discount cannot exceed the subtotal amount." / "Due date cannot be before the issue date."
- `401`, `403`.
- `404 Not Found` — "Invoice not found."

Notes/business rules:
- Amounts other than the discount (subtotal, patient, links) cannot be changed after creation — create a new invoice instead.

## POST /api/invoices/{id}/payments

Description:
Records a payment against an invoice. Recomputes `paidAmount`, `remainingAmount`, and `status` (`PartiallyPaid` or `Paid`). The recording user is stored on the payment.

Auth:
Required.

Allowed roles:
Admin, Receptionist. (Doctors get `403`.)

Route parameters:
- `id`: GUID of the invoice.

Request body (`AddPaymentDto`):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `amount` | decimal | yes | > 0, and not more than the remaining balance |
| `paymentDate` | date | yes | `yyyy-MM-dd` |
| `method` | string | yes | `Cash`, `Card`, `BankTransfer`, `CliQ`, `Other` |
| `referenceNumber` | string | no | max 100 |
| `notes` | string | no | max 1000 |

Success status code: `200 OK` — `ApiResponse<InvoiceDto>` (updated invoice, including the new payment) with message "Payment recorded".

Example request:

```bash
curl -X POST http://localhost:5106/api/invoices/3fa85f64-5717-4562-b3fc-2c963f66afa6/payments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"amount":20.00,"paymentDate":"2026-07-10","method":"Cash"}'
```

Error status codes:
- `400 Bad Request` — "Invalid payment method." / "Payment amount must be greater than zero." / "Payment amount cannot exceed the remaining balance."
- `401`, `403`.
- `404 Not Found` — "Invoice not found."

Notes/business rules:
- Overpayment is rejected — partial payments are allowed until the balance reaches zero, at which point the invoice becomes `Paid`.
- There is no payment deletion/refund endpoint; corrections are a manual/bookkeeping concern.
- The action is audit-logged (`PaymentAdded`).
