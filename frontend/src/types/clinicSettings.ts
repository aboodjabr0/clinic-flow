export interface ClinicSettings {
  id: string;
  clinicName: string;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  /** "HH:mm" form, matching an HTML time input. */
  openingTime: string | null;
  closingTime: string | null;
  defaultCurrency: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface UpdateClinicSettingsRequest {
  clinicName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  openingTime?: string;
  closingTime?: string;
  defaultCurrency: string;
}
