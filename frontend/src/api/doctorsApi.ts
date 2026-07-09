import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { CreateDoctorRequest, Doctor, UpdateDoctorRequest } from "../types/doctor";

export const doctorsApi = {
  getAll: () => apiClient.get<ApiEnvelope<Doctor[]>>("/api/doctors"),

  create: (data: CreateDoctorRequest) =>
    apiClient.post<ApiEnvelope<Doctor>>("/api/doctors", data),

  update: (id: string, data: UpdateDoctorRequest) =>
    apiClient.put<ApiEnvelope<Doctor>>(`/api/doctors/${id}`, data),

  setActiveStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiEnvelope<Doctor>>(`/api/doctors/${id}/status`, { isActive }),
};
