export type AppointmentStatus =
  | "Scheduled"
  | "Arrived"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "NoShow";

// Reserved for the Invoices/Payments phase — not yet used by any page.
export type PaymentStatus = "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded";

export type VisitStatus = "InProgress" | "Completed";
