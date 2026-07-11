import { EmptyState } from "../../../components/common/EmptyState";
import { useTranslation } from "../../../i18n/useTranslation";
import { appointmentsInHour, appointmentsOnDate, buildHourSlots, formatHourLabel } from "../../../utils/calendar";
import type { CalendarAppointment } from "../../../types/appointment";
import { CalendarEventCard } from "./CalendarEventCard";
import "./Calendar.css";

interface CalendarDayViewProps {
  date: string;
  appointments: CalendarAppointment[];
  canManageAppointments: boolean;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onSendReminder: (appointment: CalendarAppointment) => void;
}

export function CalendarDayView({
  date,
  appointments,
  canManageAppointments,
  onViewDetails,
  onEdit,
  onSendReminder,
}: CalendarDayViewProps) {
  const { t, language } = useTranslation();
  const dayAppointments = appointmentsOnDate(appointments, date);

  if (dayAppointments.length === 0) {
    return <EmptyState title={t("calendar.noAppointments")} description={t("calendar.noAppointmentsDescription")} />;
  }

  const hourSlots = buildHourSlots(dayAppointments);

  return (
    <div className="calendar-day-view">
      {hourSlots.map((hour) => {
        const items = appointmentsInHour(dayAppointments, hour);
        return (
          <div className="calendar-day-row" key={hour}>
            <div className="calendar-day-row-label">{formatHourLabel(hour, language)}</div>
            <div className="calendar-day-row-events">
              {items.map((appointment) => (
                <CalendarEventCard
                  key={appointment.id}
                  appointment={appointment}
                  canManageAppointments={canManageAppointments}
                  onViewDetails={onViewDetails}
                  onEdit={onEdit}
                  onSendReminder={onSendReminder}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
