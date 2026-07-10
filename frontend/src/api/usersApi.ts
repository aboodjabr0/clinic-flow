import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRequest,
  User,
  UserQuery,
} from "../types/user";

function buildQueryString(query: UserQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.isActive !== undefined) params.set("isActive", String(query.isActive));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const usersApi = {
  getAll: (query: UserQuery = {}) =>
    apiClient.get<ApiEnvelope<User[]>>(`/api/users${buildQueryString(query)}`),

  getById: (id: string) => apiClient.get<ApiEnvelope<User>>(`/api/users/${id}`),

  create: (data: CreateUserRequest) => apiClient.post<ApiEnvelope<User>>("/api/users", data),

  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<ApiEnvelope<User>>(`/api/users/${id}`, data),

  setActiveStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiEnvelope<User>>(`/api/users/${id}/status`, { isActive }),

  resetPassword: (id: string, data: ResetPasswordRequest) =>
    apiClient.post<ApiEnvelope<User>>(`/api/users/${id}/reset-password`, data),
};
