import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { PaginatedResponse } from "../types/patient";
import type {
  CompleteVisitRequest,
  StartVisitRequest,
  UpdateVisitRequest,
  Visit,
  VisitListItem,
  VisitQuery,
  VisitStats,
} from "../types/visit";

function buildQueryString(query: VisitQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.status) params.set("status", query.status);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.pageNumber) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const visitsApi = {
  getVisits: (query: VisitQuery) =>
    apiClient.get<ApiEnvelope<PaginatedResponse<VisitListItem>>>(`/api/visits${buildQueryString(query)}`),

  getVisitById: (id: string) => apiClient.get<ApiEnvelope<Visit>>(`/api/visits/${id}`),

  getVisitByAppointmentId: (appointmentId: string) =>
    apiClient.get<ApiEnvelope<Visit>>(`/api/appointments/${appointmentId}/visit`),

  getPatientVisits: (patientId: string) =>
    apiClient.get<ApiEnvelope<VisitListItem[]>>(`/api/patients/${patientId}/visits`),

  startVisit: (appointmentId: string, data: StartVisitRequest) =>
    apiClient.post<ApiEnvelope<Visit>>(`/api/appointments/${appointmentId}/visit/start`, data),

  updateVisit: (id: string, data: UpdateVisitRequest) =>
    apiClient.put<ApiEnvelope<Visit>>(`/api/visits/${id}`, data),

  completeVisit: (id: string, data: CompleteVisitRequest) =>
    apiClient.patch<ApiEnvelope<Visit>>(`/api/visits/${id}/complete`, data),

  getVisitStats: () => apiClient.get<ApiEnvelope<VisitStats>>("/api/visits/stats"),
};
