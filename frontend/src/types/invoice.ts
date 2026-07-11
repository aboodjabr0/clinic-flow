import type { PaymentStatus } from "./enums";

export type { PaymentStatus };

export type PaymentMethod = "Cash" | "Card" | "BankTransfer" | "CliQ" | "Other";

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  createdByUserName: string | null;
  createdAtUtc: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  appointmentId: string | null;
  visitId: string | null;
  dentalServiceId: string | null;
  serviceName: string | null;
  doctorFullName: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  notes: string | null;
  payments: Payment[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  appointmentId: string | null;
  visitId: string | null;
  serviceName: string | null;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
}

export interface CreateInvoiceRequest {
  patientId?: string;
  appointmentId?: string;
  visitId?: string;
  dentalServiceId?: string;
  subtotalAmount?: number;
  discountAmount: number;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoiceRequest {
  discountAmount?: number;
  dueDate?: string;
  notes?: string;
}

export interface AddPaymentRequest {
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface InvoiceQuery {
  search?: string;
  patientId?: string;
  appointmentId?: string;
  visitId?: string;
  status?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface InvoiceStats {
  totalInvoices: number;
  unpaidInvoices: number;
  partiallyPaidInvoices: number;
  paidInvoices: number;
  totalRevenue: number;
  outstandingBalance: number;
}
