import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { AppointmentReport, PatientReport, ReportQuery, RevenueReport } from "../types/reports";

function buildQueryString(query: ReportQuery): string {
  const params = new URLSearchParams();
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.status) params.set("status", query.status);
  if (query.isActive !== undefined) params.set("isActive", String(query.isActive));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const reportsApi = {
  getAppointmentReport: (query: ReportQuery) =>
    apiClient.get<ApiEnvelope<AppointmentReport>>(`/api/reports/appointments${buildQueryString(query)}`),

  /** Admin/Receptionist only — returns 403 for Doctor logins. */
  getRevenueReport: (query: ReportQuery) =>
    apiClient.get<ApiEnvelope<RevenueReport>>(`/api/reports/revenue${buildQueryString(query)}`),

  /** Admin/Receptionist only — returns 403 for Doctor logins. */
  getPatientReport: (query: ReportQuery) =>
    apiClient.get<ApiEnvelope<PatientReport>>(`/api/reports/patients${buildQueryString(query)}`),
};
