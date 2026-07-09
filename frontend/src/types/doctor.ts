export interface Doctor {
  id: string;
  appUserId: string | null;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  specialty: string;
  licenseNumber: string | null;
  bio: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateDoctorRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  specialty: string;
  licenseNumber?: string;
  bio?: string;
}

export interface UpdateDoctorRequest extends CreateDoctorRequest {}
