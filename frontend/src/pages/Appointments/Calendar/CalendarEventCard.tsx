import { StatusBadge } from "../../../components/common/StatusBadge";
import { useTranslation } from "../../../i18n/useTranslation";
import { APPOINTMENT_STATUS_LABEL_KEYS, APPOINTMENT_STATUS_VARIANTS } from "../../../utils/appointment";
import type { CalendarAppointment } from "../../../types/appointment";
import "./Calendar.css";

interface CalendarEventCardProps {
  appointment: CalendarAppointment;
  canManageAppointments: boolean;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  compact?: boolean;
}

export function CalendarEventCard({
  appointment,
  canManageAppointments,
  onViewDetails,
  onEdit,
  compact = false,
}: CalendarEventCardProps) {
  const { t } = useTranslation();
  const variant = APPOINTMENT_STATUS_VARIANTS[appointment.status];

  return (
    <div
      className={`calendar-event-card${compact ? " calendar-event-card-compact" : ""}`}
      data-variant={variant}
      role="button"
      tabIndex={0}
      onClick={() => onViewDetails(appointment.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails(appointment.id);
        }
      }}
    >
      <div className="calendar-event-time">
        {appointment.startTime} - {appointment.endTime}
      </div>
      <div className="calendar-event-patient">{appointment.patientFullName}</div>
      <div className="calendar-event-meta">
        {appointment.doctorFullName} · {appointment.serviceName}
      </div>
      <div className="calendar-event-footer">
        <StatusBadge label={t(APPOINTMENT_STATUS_LABEL_KEYS[appointment.status])} variant={variant} />
        {appointment.hasVisit && (
          <span className="calendar-event-indicator" title={t("calendar.visitRecorded")} aria-label={t("calendar.visitRecorded")}>
            ✓
          </span>
        )}
        <button
          type="button"
          className="calendar-event-link"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(appointment.id);
          }}
        >
          {t("calendar.viewDetails")}
        </button>
        {canManageAppointments && (
          <button
            type="button"
            className="calendar-event-link"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(appointment.id);
            }}
          >
            {t("calendar.reschedule")}
          </button>
        )}
      </div>
    </div>
  );
}
