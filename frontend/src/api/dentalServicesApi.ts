import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type {
  CreateDentalServiceRequest,
  DentalService,
  UpdateDentalServiceRequest,
} from "../types/dentalService";

export const dentalServicesApi = {
  getAll: () => apiClient.get<ApiEnvelope<DentalService[]>>("/api/dental-services"),

  create: (data: CreateDentalServiceRequest) =>
    apiClient.post<ApiEnvelope<DentalService>>("/api/dental-services", data),

  update: (id: string, data: UpdateDentalServiceRequest) =>
    apiClient.put<ApiEnvelope<DentalService>>(`/api/dental-services/${id}`, data),

  setActiveStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiEnvelope<DentalService>>(`/api/dental-services/${id}/status`, { isActive }),
};
