import { EmptyState } from "../../../components/common/EmptyState";
import { useTranslation } from "../../../i18n/useTranslation";
import { appointmentsOnDate, formatDayHeader, todayIsoLocal } from "../../../utils/calendar";
import type { CalendarAppointment } from "../../../types/appointment";
import { CalendarEventCard } from "./CalendarEventCard";
import "./Calendar.css";

interface CalendarWeekViewProps {
  weekDays: string[];
  appointments: CalendarAppointment[];
  canManageAppointments: boolean;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
}

export function CalendarWeekView({ weekDays, appointments, canManageAppointments, onViewDetails, onEdit }: CalendarWeekViewProps) {
  const { t, language } = useTranslation();

  if (appointments.length === 0) {
    return <EmptyState title={t("calendar.noAppointments")} description={t("calendar.noAppointmentsDescription")} />;
  }

  const today = todayIsoLocal();

  return (
    <div className="calendar-week-view">
      {weekDays.map((day) => {
        const dayAppointments = appointmentsOnDate(appointments, day);
        return (
          <div className={`calendar-week-day${day === today ? " calendar-week-day-today" : ""}`} key={day}>
            <div className="calendar-week-day-header">
              <span>{formatDayHeader(day, language)}</span>
              {dayAppointments.length > 0 && <span className="calendar-week-day-count">{dayAppointments.length}</span>}
            </div>
            <div className="calendar-week-day-events">
              {dayAppointments.length === 0 ? (
                <p className="calendar-week-day-empty">{t("calendar.noAppointments")}</p>
              ) : (
                dayAppointments.map((appointment) => (
                  <CalendarEventCard
                    key={appointment.id}
                    appointment={appointment}
                    canManageAppointments={canManageAppointments}
                    onViewDetails={onViewDetails}
                    onEdit={onEdit}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
