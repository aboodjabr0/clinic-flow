import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { EmptyState } from "../../../components/common/EmptyState";
import { LoadingState } from "../../../components/common/LoadingState";
import { WhatsAppReminderModal } from "../../../components/appointments/WhatsAppReminderModal";
import { appointmentsApi } from "../../../api/appointmentsApi";
import { ApiError } from "../../../api/apiClient";
import { useTranslation } from "../../../i18n/useTranslation";
import { ALL_APPOINTMENT_STATUSES, APPOINTMENT_STATUS_LABEL_KEYS } from "../../../utils/appointment";
import { addDaysIso, formatRangeLabel, getWeekDaysIso, todayIsoLocal } from "../../../utils/calendar";
import type { Doctor } from "../../../types/doctor";
import type { AppointmentStatus, CalendarAppointment } from "../../../types/appointment";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarWeekView } from "./CalendarWeekView";
import "./Calendar.css";

type ViewMode = "day" | "week";
type StatusFilter = "all" | AppointmentStatus;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

interface AppointmentsCalendarViewProps {
  doctors: Doctor[];
  isDoctorRole: boolean;
  canManageAppointments: boolean;
  onEdit: (id: string) => void;
}

export function AppointmentsCalendarView({ doctors, isDoctorRole, canManageAppointments, onEdit }: AppointmentsCalendarViewProps) {
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(todayIsoLocal());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [remindingAppointment, setRemindingAppointment] = useState<CalendarAppointment | null>(null);

  const range = useMemo(() => {
    if (viewMode === "day") {
      return { start: anchorDate, end: anchorDate };
    }
    const weekDays = getWeekDaysIso(anchorDate);
    return { start: weekDays[0], end: weekDays[6] };
  }, [viewMode, anchorDate]);

  const loadCalendar = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const response = await appointmentsApi.getCalendarAppointments({
        startDate: range.start,
        endDate: range.end,
        doctorId: !isDoctorRole && doctorFilter !== "all" ? doctorFilter : undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setAppointments(response.data);
      setLoadState({ status: "loaded" });
    } catch (error) {
      setAppointments([]);
      setLoadState({
        status: "error",
        message: error instanceof ApiError ? error.message : t("calendar.unableToLoad"),
      });
    }
  }, [range.start, range.end, doctorFilter, statusFilter, isDoctorRole, t]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  function goToday() {
    setAnchorDate(todayIsoLocal());
  }

  function goPrevious() {
    setAnchorDate((current) => addDaysIso(current, viewMode === "day" ? -1 : -7));
  }

  function goNext() {
    setAnchorDate((current) => addDaysIso(current, viewMode === "day" ? 1 : 7));
  }

  function goToDetails(id: string) {
    navigate(`/appointments/${id}`);
  }

  return (
    <div className="appointments-calendar" aria-label={t("calendar.appointmentCalendar")}>
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-nav">
          <Button type="button" variant="secondary" onClick={goPrevious} aria-label={t("calendar.previous")}>
            ‹
          </Button>
          <Button type="button" variant={anchorDate === todayIsoLocal() ? "primary" : "secondary"} onClick={goToday}>
            {t("appointments.today")}
          </Button>
          <Button type="button" variant="secondary" onClick={goNext} aria-label={t("calendar.next")}>
            ›
          </Button>
          <Input
            type="date"
            aria-label={t("calendar.selectDate")}
            value={anchorDate}
            onChange={(e) => e.target.value && setAnchorDate(e.target.value)}
          />
        </div>
        <div className="calendar-toolbar-view-toggle">
          <Button type="button" variant={viewMode === "day" ? "primary" : "secondary"} onClick={() => setViewMode("day")}>
            {t("calendar.day")}
          </Button>
          <Button type="button" variant={viewMode === "week" ? "primary" : "secondary"} onClick={() => setViewMode("week")}>
            {t("calendar.week")}
          </Button>
        </div>
      </div>

      <div className="calendar-toolbar calendar-toolbar-filters">
        <span className="calendar-range-label">{formatRangeLabel(range.start, range.end, language)}</span>
        <div className="calendar-toolbar-filter-controls">
          {!isDoctorRole && (
            <Select
              aria-label={t("calendar.filterByDoctor")}
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="all">{t("appointments.allDoctors")}</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </Select>
          )}
          <Select
            aria-label={t("calendar.filterByStatus")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">{t("appointments.allStatuses")}</option>
            {ALL_APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(APPOINTMENT_STATUS_LABEL_KEYS[status])}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loadState.status === "loading" && <LoadingState label={t("calendar.loading")} />}

      {loadState.status === "error" && <EmptyState title={t("calendar.unableToLoad")} description={loadState.message} />}

      {loadState.status === "loaded" && viewMode === "day" && (
        <CalendarDayView
          date={anchorDate}
          appointments={appointments}
          canManageAppointments={canManageAppointments}
          onViewDetails={goToDetails}
          onEdit={onEdit}
          onSendReminder={setRemindingAppointment}
        />
      )}

      {loadState.status === "loaded" && viewMode === "week" && (
        <CalendarWeekView
          weekDays={getWeekDaysIso(anchorDate)}
          appointments={appointments}
          canManageAppointments={canManageAppointments}
          onViewDetails={goToDetails}
          onEdit={onEdit}
          onSendReminder={setRemindingAppointment}
        />
      )}

      {remindingAppointment && (
        <WhatsAppReminderModal
          isOpen={remindingAppointment !== null}
          onClose={() => setRemindingAppointment(null)}
          patientName={remindingAppointment.patientFullName}
          patientPhone={remindingAppointment.patientPhoneNumber}
          doctorName={remindingAppointment.doctorFullName}
          appointmentDate={remindingAppointment.appointmentDate}
          appointmentTime={remindingAppointment.startTime}
        />
      )}
    </div>
  );
}
