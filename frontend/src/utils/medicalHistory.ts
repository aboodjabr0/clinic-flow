import type { TranslationKey } from "../i18n/translations";
import type {
  DiabetesStatus,
  PatientMedicalHistory,
  PregnancyStatus,
  SmokingStatus,
} from "../types/medicalHistory";

export const PREGNANCY_STATUS_LABEL_KEYS: Record<PregnancyStatus, TranslationKey> = {
  Unknown: "medicalHistory.pregnancyUnknown",
  NotPregnant: "medicalHistory.pregnancyNot",
  Pregnant: "medicalHistory.pregnancyPregnant",
  NotApplicable: "medicalHistory.pregnancyNotApplicable",
};

export const SMOKING_STATUS_LABEL_KEYS: Record<SmokingStatus, TranslationKey> = {
  Unknown: "medicalHistory.smokingUnknown",
  NeverSmoker: "medicalHistory.smokingNever",
  FormerSmoker: "medicalHistory.smokingFormer",
  CurrentSmoker: "medicalHistory.smokingCurrent",
};

export const DIABETES_STATUS_LABEL_KEYS: Record<DiabetesStatus, TranslationKey> = {
  Unknown: "medicalHistory.diabetesUnknown",
  No: "medicalHistory.diabetesNo",
  Yes: "medicalHistory.diabetesYes",
};

/** True once a medical history record has been saved for the patient. */
export function hasRecordedHistory(history: PatientMedicalHistory): boolean {
  return history.lastUpdatedAtUtc !== null;
}

export interface MedicalRisk {
  labelKey: TranslationKey;
  /** Free-text detail shown next to the label (e.g. the allergy list). */
  detail?: string;
}

/**
 * High-risk items a dentist must see before treatment. Order matters: the
 * most treatment-critical flags come first.
 */
export function getMedicalRisks(history: PatientMedicalHistory): MedicalRisk[] {
  const risks: MedicalRisk[] = [];

  if (history.allergies) {
    risks.push({ labelKey: "medicalHistory.allergies", detail: history.allergies });
  }
  if (history.medicalAlerts) {
    risks.push({ labelKey: "medicalHistory.medicalAlerts", detail: history.medicalAlerts });
  }
  if (history.bloodThinners) {
    risks.push({ labelKey: "medicalHistory.bloodThinners" });
  }
  if (history.anesthesiaSensitivity) {
    risks.push({ labelKey: "medicalHistory.anesthesiaSensitivity" });
  }
  if (history.heartDisease) {
    risks.push({ labelKey: "medicalHistory.heartDisease" });
  }
  if (history.diabetesStatus === "Yes") {
    risks.push({ labelKey: "medicalHistory.diabetes" });
  }
  if (history.pregnancyStatus === "Pregnant") {
    risks.push({ labelKey: "medicalHistory.pregnancyPregnant" });
  }

  return risks;
}
