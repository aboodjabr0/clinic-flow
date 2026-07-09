export interface DentalService {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: number;
  durationMinutes: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateDentalServiceRequest {
  name: string;
  description?: string;
  defaultPrice: number;
  durationMinutes: number;
}

export interface UpdateDentalServiceRequest extends CreateDentalServiceRequest {}
