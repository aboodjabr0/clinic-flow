export type PregnancyStatus = "Unknown" | "NotPregnant" | "Pregnant" | "NotApplicable";
export type SmokingStatus = "Unknown" | "NeverSmoker" | "FormerSmoker" | "CurrentSmoker";
export type DiabetesStatus = "Unknown" | "No" | "Yes";

export interface PatientMedicalHistory {
  patientId: string;
  allergies: string | null;
  chronicDiseases: string | null;
  currentMedications: string | null;
  previousSurgeries: string | null;
  pregnancyStatus: PregnancyStatus;
  smokingStatus: SmokingStatus;
  diabetesStatus: DiabetesStatus;
  bloodPressureNotes: string | null;
  heartDisease: boolean;
  bloodThinners: boolean;
  anesthesiaSensitivity: boolean;
  medicalAlerts: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  /** Null when no history record has been saved for the patient yet. */
  lastUpdatedAtUtc: string | null;
  lastUpdatedByUserName: string | null;
}

export interface UpsertMedicalHistoryRequest {
  allergies?: string;
  chronicDiseases?: string;
  currentMedications?: string;
  previousSurgeries?: string;
  pregnancyStatus?: PregnancyStatus;
  smokingStatus?: SmokingStatus;
  diabetesStatus?: DiabetesStatus;
  bloodPressureNotes?: string;
  heartDisease: boolean;
  bloodThinners: boolean;
  anesthesiaSensitivity: boolean;
  medicalAlerts?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
