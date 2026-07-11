import type { AppointmentStatus } from "./enums";

export type { AppointmentStatus };

export interface Appointment {
  id: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  doctorProfileId: string;
  doctorFullName: string;
  dentalServiceId: string;
  serviceName: string;
  servicePrice: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  cancellationReason: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface AppointmentListItem {
  id: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  doctorProfileId: string;
  doctorFullName: string;
  dentalServiceId: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string | null;
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorProfileId: string;
  dentalServiceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentRequest extends CreateAppointmentRequest {}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface AppointmentQuery {
  search?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  patientId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface AppointmentStats {
  totalAppointments: number;
  todayAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledOrNoShowAppointments: number;
}

export interface CalendarAppointment {
  id: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  doctorProfileId: string;
  doctorFullName: string;
  dentalServiceId: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string | null;
  hasVisit: boolean;
  invoiceStatus: string | null;
}

export interface CalendarQuery {
  startDate: string;
  endDate: string;
  doctorId?: string;
  status?: AppointmentStatus;
}
