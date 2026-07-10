import type { PatientGender } from "../types/patient";
import type { TranslationKey } from "../i18n/translations";

export const GENDER_LABEL_KEYS: Record<PatientGender, TranslationKey> = {
  Male: "status.gender.male",
  Female: "status.gender.female",
  Other: "status.gender.other",
  PreferNotToSay: "status.gender.preferNotToSay",
};

export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
