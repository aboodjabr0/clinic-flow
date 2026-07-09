import type { AppointmentStatus, PaymentStatus } from "./enums";
import type { PatientGender } from "./patient";

export interface ReportQuery {
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  isActive?: boolean;
}

export interface AppointmentReportRow {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  patientFullName: string;
  doctorFullName: string;
  serviceName: string;
  status: AppointmentStatus;
}

export interface AppointmentReport {
  fromDate: string;
  toDate: string;
  totalCount: number;
  completedCount: number;
  cancelledOrNoShowCount: number;
  rows: AppointmentReportRow[];
}

export interface RevenueReportRow {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  patientFullName: string;
  serviceName: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
}

export interface RevenueReport {
  fromDate: string;
  toDate: string;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  rows: RevenueReportRow[];
}

export interface PatientReportRow {
  id: string;
  fullName: string;
  phoneNumber: string;
  gender: PatientGender;
  isActive: boolean;
  registeredDate: string;
}

export interface PatientReport {
  fromDate: string;
  toDate: string;
  totalCount: number;
  activeCount: number;
  rows: PatientReportRow[];
}
