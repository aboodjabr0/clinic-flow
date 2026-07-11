import type { TranslationKey } from "../i18n/translations";

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * Normalizes a Jordan phone number to the digits-only "9627XXXXXXXX" form
 * required by wa.me links. Returns null if the number doesn't look like a
 * valid Jordan mobile number. Never mutates the input.
 */
export function normalizeJordanPhone(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;

  let digits = rawPhone.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }
  digits = digits.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = `962${digits.slice(1)}`;
  } else if (digits.startsWith("7") && digits.length === 9) {
    digits = `962${digits}`;
  }

  return /^9627\d{8}$/.test(digits) ? digits : null;
}

/** Builds a wa.me link for a normalized phone number. Returns null if the phone is invalid. */
export function buildWhatsAppUrl(rawPhone: string | null | undefined, message: string): string | null {
  const normalized = normalizeJordanPhone(rawPhone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export interface ReminderMessageParams {
  patientName: string;
  clinicName?: string | null;
  date: string;
  time: string;
  doctorName?: string | null;
}

/** Builds a translated, human-friendly appointment reminder message. */
export function buildReminderMessage(t: Translate, params: ReminderMessageParams): string {
  const clinicName = params.clinicName?.trim() || t("whatsapp.defaultClinicName");

  const lines = [
    t("whatsapp.greeting", { patientName: params.patientName }),
    t("whatsapp.bodyLine", { clinicName, date: params.date, time: params.time }),
  ];

  if (params.doctorName?.trim()) {
    lines.push(t("whatsapp.doctorLine", { doctorName: params.doctorName }));
  }

  lines.push(t("whatsapp.rescheduleLine"));
  lines.push(t("whatsapp.thanksLine"));

  return lines.join("\n");
}
