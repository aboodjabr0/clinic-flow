import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type {
  CreatePatientRequest,
  PaginatedResponse,
  Patient,
  PatientListItem,
  PatientQuery,
  PatientStats,
  UpdatePatientRequest,
} from "../types/patient";

function buildQueryString(query: PatientQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.isActive !== undefined) params.set("isActive", String(query.isActive));
  if (query.gender) params.set("gender", query.gender);
  if (query.pageNumber) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const patientsApi = {
  getPatients: (query: PatientQuery) =>
    apiClient.get<ApiEnvelope<PaginatedResponse<PatientListItem>>>(
      `/api/patients${buildQueryString(query)}`,
    ),

  getPatientById: (id: string) => apiClient.get<ApiEnvelope<Patient>>(`/api/patients/${id}`),

  createPatient: (data: CreatePatientRequest) =>
    apiClient.post<ApiEnvelope<Patient>>("/api/patients", data),

  updatePatient: (id: string, data: UpdatePatientRequest) =>
    apiClient.put<ApiEnvelope<Patient>>(`/api/patients/${id}`, data),

  setPatientStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiEnvelope<Patient>>(`/api/patients/${id}/status`, { isActive }),

  getPatientStats: () => apiClient.get<ApiEnvelope<PatientStats>>("/api/patients/stats"),
};
