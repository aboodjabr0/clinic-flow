import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { PaginatedResponse } from "../types/patient";
import type {
  AddPaymentRequest,
  CreateInvoiceRequest,
  Invoice,
  InvoiceListItem,
  InvoiceQuery,
  InvoiceStats,
  UpdateInvoiceRequest,
} from "../types/invoice";

function buildQueryString(query: InvoiceQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.appointmentId) params.set("appointmentId", query.appointmentId);
  if (query.visitId) params.set("visitId", query.visitId);
  if (query.status) params.set("status", query.status);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.pageNumber) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const invoicesApi = {
  getInvoices: (query: InvoiceQuery) =>
    apiClient.get<ApiEnvelope<PaginatedResponse<InvoiceListItem>>>(`/api/invoices${buildQueryString(query)}`),

  getInvoiceStats: () => apiClient.get<ApiEnvelope<InvoiceStats>>("/api/invoices/stats"),

  getInvoiceById: (id: string) => apiClient.get<ApiEnvelope<Invoice>>(`/api/invoices/${id}`),

  getPatientInvoices: (patientId: string) =>
    apiClient.get<ApiEnvelope<InvoiceListItem[]>>(`/api/patients/${patientId}/invoices`),

  getInvoiceByAppointmentId: (appointmentId: string) =>
    apiClient.get<ApiEnvelope<Invoice>>(`/api/appointments/${appointmentId}/invoice`),

  getInvoiceByVisitId: (visitId: string) =>
    apiClient.get<ApiEnvelope<Invoice>>(`/api/visits/${visitId}/invoice`),

  createInvoice: (data: CreateInvoiceRequest) => apiClient.post<ApiEnvelope<Invoice>>("/api/invoices", data),

  updateInvoice: (id: string, data: UpdateInvoiceRequest) =>
    apiClient.put<ApiEnvelope<Invoice>>(`/api/invoices/${id}`, data),

  addPayment: (invoiceId: string, data: AddPaymentRequest) =>
    apiClient.post<ApiEnvelope<Invoice>>(`/api/invoices/${invoiceId}/payments`, data),
};
