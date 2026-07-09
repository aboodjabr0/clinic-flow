import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type { AuthUser, LoginRequest, LoginResponse } from "../types/auth";

export const authApi = {
  login: (credentials: LoginRequest) =>
    apiClient.post<ApiEnvelope<LoginResponse>>("/api/auth/login", credentials),

  getCurrentUser: () => apiClient.get<ApiEnvelope<AuthUser>>("/api/auth/me"),

  logout: () => apiClient.post<ApiEnvelope<unknown>>("/api/auth/logout"),
};
