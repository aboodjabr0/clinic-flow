import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { PaginatedResponse } from "../types/patient";
import type {
  Appointment,
  AppointmentListItem,
  AppointmentQuery,
  AppointmentStats,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from "../types/appointment";

function buildQueryString(query: AppointmentQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.date) params.set("date", query.date);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.serviceId) params.set("serviceId", query.serviceId);
  if (query.status) params.set("status", query.status);
  if (query.pageNumber) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const appointmentsApi = {
  getAppointments: (query: AppointmentQuery) =>
    apiClient.get<ApiEnvelope<PaginatedResponse<AppointmentListItem>>>(
      `/api/appointments${buildQueryString(query)}`,
    ),

  getTodayAppointments: () =>
    apiClient.get<ApiEnvelope<AppointmentListItem[]>>("/api/appointments/today"),

  getAppointmentById: (id: string) =>
    apiClient.get<ApiEnvelope<Appointment>>(`/api/appointments/${id}`),

  createAppointment: (data: CreateAppointmentRequest) =>
    apiClient.post<ApiEnvelope<Appointment>>("/api/appointments", data),

  updateAppointment: (id: string, data: UpdateAppointmentRequest) =>
    apiClient.put<ApiEnvelope<Appointment>>(`/api/appointments/${id}`, data),

  updateAppointmentStatus: (id: string, data: UpdateAppointmentStatusRequest) =>
    apiClient.patch<ApiEnvelope<Appointment>>(`/api/appointments/${id}/status`, data),

  cancelAppointment: (id: string, cancellationReason?: string) =>
    apiClient.patch<ApiEnvelope<Appointment>>(`/api/appointments/${id}/cancel`, { cancellationReason }),

  getAppointmentStats: () =>
    apiClient.get<ApiEnvelope<AppointmentStats>>("/api/appointments/stats"),

  getPatientAppointments: (patientId: string) =>
    apiClient.get<ApiEnvelope<AppointmentListItem[]>>(`/api/patients/${patientId}/appointments`),
};
