import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { ClinicSettings, UpdateClinicSettingsRequest } from "../types/clinicSettings";

export const clinicSettingsApi = {
  get: () => apiClient.get<ApiEnvelope<ClinicSettings>>("/api/clinic-settings"),

  update: (data: UpdateClinicSettingsRequest) =>
    apiClient.put<ApiEnvelope<ClinicSettings>>("/api/clinic-settings", data),
};
