export type PatientGender = "Male" | "Female" | "Other" | "PreferNotToSay";

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  gender: PatientGender;
  dateOfBirth: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  allergies: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface PatientListItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  gender: PatientGender;
  dateOfBirth: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  gender: PatientGender;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  allergies?: string;
}

export interface UpdatePatientRequest extends CreatePatientRequest {}

export interface PatientQuery {
  search?: string;
  isActive?: boolean;
  gender?: PatientGender;
  pageNumber?: number;
  pageSize?: number;
}

export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  newPatientsThisMonth: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
