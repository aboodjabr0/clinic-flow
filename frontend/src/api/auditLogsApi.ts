import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { AuditLog, AuditLogListItem, AuditLogQuery } from "../types/auditLog";
import type { PaginatedResponse } from "../types/patient";

function buildQueryString(query: AuditLogQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.userId) params.set("userId", query.userId);
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.action) params.set("action", query.action);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.pageNumber) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const auditLogsApi = {
  getAuditLogs: (query: AuditLogQuery) =>
    apiClient.get<ApiEnvelope<PaginatedResponse<AuditLogListItem>>>(
      `/api/audit-logs${buildQueryString(query)}`,
    ),

  getAuditLogById: (id: string) => apiClient.get<ApiEnvelope<AuditLog>>(`/api/audit-logs/${id}`),
};
