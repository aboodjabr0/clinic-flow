import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { PatientMedicalHistory, UpsertMedicalHistoryRequest } from "../types/medicalHistory";

export const medicalHistoryApi = {
  getMedicalHistory: (patientId: string) =>
    apiClient.get<ApiEnvelope<PatientMedicalHistory>>(`/api/patients/${patientId}/medical-history`),

  upsertMedicalHistory: (patientId: string, data: UpsertMedicalHistoryRequest) =>
    apiClient.put<ApiEnvelope<PatientMedicalHistory>>(`/api/patients/${patientId}/medical-history`, data),
};
