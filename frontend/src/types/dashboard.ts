import type { AppointmentStatus, PaymentStatus, VisitStatus } from "./enums";

/**
 * Financial fields are null when the current user is a Doctor — the backend
 * only includes them for Admin/Receptionist.
 */
export interface DashboardSummary {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  todayAppointments: number;
  scheduledAppointments: number;
  completedAppointmentsThisMonth: number;
  inProgressVisits: number;
  completedVisitsThisMonth: number;
  unpaidInvoices: number | null;
  partiallyPaidInvoices: number | null;
  paidInvoicesThisMonth: number | null;
  totalRevenueThisMonth: number | null;
  outstandingBalance: number | null;
}

export interface RecentAppointment {
  id: string;
  patientFullName: string;
  doctorFullName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
}

export interface RecentVisit {
  id: string;
  patientFullName: string;
  doctorFullName: string;
  serviceName: string;
  visitDate: string;
  status: VisitStatus;
  followUpDate: string | null;
}

export interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  patientFullName: string;
  issueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
}

export interface UpcomingFollowUp {
  visitId: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  doctorFullName: string;
  followUpDate: string;
}

export interface TodayClinic {
  date: string;
  totalAppointments: number;
  arrived: number;
  inProgress: number;
  completedToday: number;
  cancelledOrNoShowToday: number;
  appointments: RecentAppointment[];
}

export interface MonthlyRevenuePoint {
  year: number;
  month: number;
  label: string;
  totalPaid: number;
}

export interface DashboardRevenue {
  currentMonthRevenue: number;
  currentMonthOutstanding: number;
  totalPaidAmount: number;
  totalUnpaidAmount: number;
  recentPaidInvoices: RecentInvoice[];
  monthlyRevenue: MonthlyRevenuePoint[];
}

export interface AppointmentStatusBreakdown {
  scheduled: number;
  arrived: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface RecentActivity {
  recentAppointments: RecentAppointment[];
  recentVisits: RecentVisit[];
  recentInvoices: RecentInvoice[];
}
