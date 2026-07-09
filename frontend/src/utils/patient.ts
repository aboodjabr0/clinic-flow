import type { PatientGender } from "../types/patient";

export const GENDER_LABELS: Record<PatientGender, string> = {
  Male: "Male",
  Female: "Female",
  Other: "Other",
  PreferNotToSay: "Prefer not to say",
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
