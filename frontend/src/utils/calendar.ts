import type { CalendarAppointment } from "../types/appointment";

export const DAY_VIEW_START_HOUR = 8;
export const DAY_VIEW_END_HOUR = 20;

/** Formats a Date as a local "YYYY-MM-DD" string (not UTC, to avoid midnight off-by-one-day bugs). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayIsoLocal(): string {
  return toIsoDate(new Date());
}

export function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Sunday-based start of the week containing the given date. */
export function startOfWeekIso(iso: string): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() - date.getDay());
  return toIsoDate(date);
}

export function getWeekDaysIso(iso: string): string[] {
  const start = startOfWeekIso(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}

function localeFor(language: "en" | "ar"): string {
  return language === "ar" ? "ar" : "en-US";
}

export function formatDayHeader(iso: string, language: "en" | "ar"): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseIsoDate(iso));
}

export function formatRangeLabel(startIso: string, endIso: string, language: "en" | "ar"): string {
  const locale = localeFor(language);
  if (startIso === endIso) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(parseIsoDate(startIso));
  }
  const startLabel = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(parseIsoDate(startIso));
  const endLabel = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(
    parseIsoDate(endIso),
  );
  return `${startLabel} – ${endLabel}`;
}

export function formatHourLabel(hour: number, language: "en" | "ar"): string {
  const date = new Date(2000, 0, 1, hour, 0);
  return new Intl.DateTimeFormat(localeFor(language), { hour: "numeric", hour12: true }).format(date);
}

function hourOf(time: string): number {
  const hour = Number(time.split(":")[0]);
  return Number.isNaN(hour) ? DAY_VIEW_START_HOUR : hour;
}

/** Builds the hour rows for a day timeline, widening the default business-hours window to include any appointment that falls outside it so nothing is ever hidden. */
export function buildHourSlots(
  appointments: Pick<CalendarAppointment, "startTime">[],
  startHour: number = DAY_VIEW_START_HOUR,
  endHour: number = DAY_VIEW_END_HOUR,
): number[] {
  let minHour = startHour;
  let maxHour = endHour - 1;
  for (const appointment of appointments) {
    const hour = hourOf(appointment.startTime);
    if (hour < minHour) minHour = hour;
    if (hour > maxHour) maxHour = hour;
  }

  const slots: number[] = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    slots.push(hour);
  }
  return slots;
}

export function appointmentsInHour(appointments: CalendarAppointment[], hour: number): CalendarAppointment[] {
  return appointments
    .filter((appointment) => hourOf(appointment.startTime) === hour)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function appointmentsOnDate(appointments: CalendarAppointment[], iso: string): CalendarAppointment[] {
  return appointments
    .filter((appointment) => appointment.appointmentDate === iso)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
