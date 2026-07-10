import type { UserRole } from "./auth";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  doctorProfileId: string | null;
  doctorProfileName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  doctorProfileId?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  doctorProfileId?: string;
  isActive: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface UserQuery {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}
