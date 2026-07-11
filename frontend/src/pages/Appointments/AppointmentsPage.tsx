import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Textarea } from "../../components/common/Textarea";
import { Modal } from "../../components/common/Modal";
import { Pagination } from "../../components/common/Pagination";
import { WhatsAppReminderModal } from "../../components/appointments/WhatsAppReminderModal";
import { StatCard } from "../../components/dashboard/StatCard";
import { AppointmentsCalendarView } from "./Calendar/AppointmentsCalendarView";
import { appointmentsApi } from "../../api/appointmentsApi";
import { visitsApi } from "../../api/visitsApi";
import { doctorsApi } from "../../api/doctorsApi";
import { dentalServicesApi } from "../../api/dentalServicesApi";
import { patientsApi } from "../../api/patientsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import {
  ALL_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABEL_KEYS,
  APPOINTMENT_STATUS_VARIANTS,
  addMinutesToTime,
  getAllowedStatusTransitions,
} from "../../utils/appointment";
import type { Doctor } from "../../types/doctor";
import type { DentalService } from "../../types/dentalService";
import type { PatientListItem } from "../../types/patient";
import type {
  Appointment,
  AppointmentListItem,
  AppointmentStats,
  AppointmentStatus,
  CreateAppointmentRequest,
} from "../../types/appointment";
import "./AppointmentsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type StatusFilter = "all" | AppointmentStatus;
type AppointmentsTab = "calendar" | "list";

interface AppointmentFormState {
  patientId: string;
  doctorProfileId: string;
  dentalServiceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  notes: string;
}

const PAGE_SIZE = 10;

const EMPTY_FORM: AppointmentFormState = {
  patientId: "",
  doctorProfileId: "",
  dentalServiceId: "",
  appointmentDate: "",
  startTime: "",
  endTime: "",
  reason: "",
  notes: "",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AppointmentsPage() {
  const { user, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageAppointments = hasAnyRole(["Admin", "Receptionist"]);
  const canManageVisits = hasAnyRole(["Admin", "Doctor"]);
  const allowedStatuses = user ? getAllowedStatusTransitions(user.role) : [];
  const patientIdFilter = searchParams.get("patientId");

  // Deep links from the patient details page filter by patientId, which the
  // calendar endpoint doesn't support — land on List in that case so the
  // filter still applies.
  const [activeTab, setActiveTab] = useState<AppointmentsTab>(patientIdFilter ? "list" : "calendar");

  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<DentalService[]>([]);
  const [patients, setPatients] = useState<PatientListItem[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AppointmentFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [cancellingAppointment, setCancellingAppointment] = useState<AppointmentListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [remindingAppointment, setRemindingAppointment] = useState<AppointmentListItem | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadAppointments = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await appointmentsApi.getAppointments({
        search: search || undefined,
        date: dateFilter || undefined,
        doctorId: doctorFilter === "all" ? undefined : doctorFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        patientId: patientIdFilter ?? undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setAppointments(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("appointments.errorReachApi");
      setView({ status: "error", message });
    }
  }, [search, dateFilter, doctorFilter, statusFilter, patientIdFilter, pageNumber, t]);

  const loadStats = useCallback(async () => {
    try {
      const response = await appointmentsApi.getAppointmentStats();
      setStats(response.data);
    } catch {
      setStats(null);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    try {
      const [doctorsResponse, servicesResponse, patientsResponse] = await Promise.all([
        doctorsApi.getAll(),
        dentalServicesApi.getAll(),
        patientsApi.getPatients({ isActive: true, pageNumber: 1, pageSize: 100 }),
      ]);
      setDoctors(doctorsResponse.data);
      setServices(servicesResponse.data);
      setPatients(patientsResponse.data.items);
    } catch {
      // Reference data is only needed for filters/forms — the table can still load without it.
    }
  }, []);

  useEffect(() => {
    if (activeTab === "list") {
      loadAppointments();
    }
  }, [loadAppointments, activeTab]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const activeDoctors = doctors.filter((d) => d.isActive);
  const activeServices = services.filter((s) => s.isActive);

  function openCreateModal() {
    setEditingAppointment(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(appointment: Appointment) {
    setEditingAppointment(appointment);
    setForm({
      patientId: appointment.patientId,
      doctorProfileId: appointment.doctorProfileId,
      dentalServiceId: appointment.dentalServiceId,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      reason: appointment.reason ?? "",
      notes: appointment.notes ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function openEditModalFor(id: string) {
    try {
      const response = await appointmentsApi.getAppointmentById(id);
      openEditModal(response.data);
    } catch (error) {
      setView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("appointments.errorUnableToLoad"),
      });
    }
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
  }

  function handleServiceChange(serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    setForm((prev) => ({
      ...prev,
      dentalServiceId: serviceId,
      endTime: prev.startTime && service ? addMinutesToTime(prev.startTime, service.durationMinutes) : prev.endTime,
    }));
  }

  function handleStartTimeChange(startTime: string) {
    const service = services.find((s) => s.id === form.dentalServiceId);
    setForm((prev) => ({
      ...prev,
      startTime,
      endTime: startTime && service ? addMinutesToTime(startTime, service.durationMinutes) : prev.endTime,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.patientId || !form.doctorProfileId || !form.dentalServiceId) {
      setFormError(t("appointments.errorRequiredFields"));
      return;
    }
    if (!form.appointmentDate) {
      setFormError(t("appointments.errorDateRequired"));
      return;
    }
    if (!form.startTime || !form.endTime) {
      setFormError(t("appointments.errorTimesRequired"));
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError(t("appointments.errorEndAfterStart"));
      return;
    }

    const payload: CreateAppointmentRequest = {
      patientId: form.patientId,
      doctorProfileId: form.doctorProfileId,
      dentalServiceId: form.dentalServiceId,
      appointmentDate: form.appointmentDate,
      startTime: form.startTime,
      endTime: form.endTime,
      reason: form.reason.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingAppointment) {
        await appointmentsApi.updateAppointment(editingAppointment.id, payload);
      } else {
        await appointmentsApi.createAppointment(payload);
      }
      setIsModalOpen(false);
      await loadAppointments();
      await loadStats();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("appointments.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(appointment: AppointmentListItem, status: AppointmentStatus) {
    if (status === appointment.status) return;
    try {
      await appointmentsApi.updateAppointmentStatus(appointment.id, { status });
      await loadAppointments();
      await loadStats();
    } catch (error) {
      setView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("appointments.errorUnableToUpdateStatus"),
      });
    }
  }

  function openCancelModal(appointment: AppointmentListItem) {
    setCancellingAppointment(appointment);
    setCancelReason("");
  }

  function closeCancelModal() {
    if (isCancelling) return;
    setCancellingAppointment(null);
  }

  async function handleConfirmCancel() {
    if (!cancellingAppointment) return;
    setIsCancelling(true);
    try {
      await appointmentsApi.cancelAppointment(cancellingAppointment.id, cancelReason.trim() || undefined);
      setCancellingAppointment(null);
      await loadAppointments();
      await loadStats();
    } catch (error) {
      setView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("appointments.errorUnableToCancel"),
      });
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleOpenVisit(appointmentId: string) {
    try {
      const response = await visitsApi.getVisitByAppointmentId(appointmentId);
      navigate(`/visits/${response.data.id}`);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) {
        setView({ status: "error", message: error instanceof ApiError ? error.message : t("appointments.errorUnableToLoadVisit") });
        return;
      }
      try {
        const startResponse = await visitsApi.startVisit(appointmentId, {});
        navigate(`/visits/${startResponse.data.id}`);
      } catch (startError) {
        setView({
          status: "error",
          message: startError instanceof ApiError ? startError.message : t("appointments.errorUnableToStartVisit"),
        });
      }
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setDateFilter("");
    setStatusFilter("all");
    setDoctorFilter("all");
    setPageNumber(1);
    if (patientIdFilter) {
      setSearchParams((params) => {
        params.delete("patientId");
        return params;
      });
    }
  }

  return (
    <>
      <PageHeader
        title={t("appointments.title")}
        subtitle={t("appointments.subtitle")}
        actions={canManageAppointments ? <Button onClick={openCreateModal}>{t("appointments.addAppointment")}</Button> : undefined}
      />

      {stats && (
        <div className="appointments-stats">
          <StatCard label={t("appointments.statTotal")} value={stats.totalAppointments} />
          <StatCard label={t("appointments.statToday")} value={stats.todayAppointments} />
          <StatCard label={t("appointments.statScheduled")} value={stats.scheduledAppointments} />
          <StatCard label={t("appointments.statCompleted")} value={stats.completedAppointments} />
          <StatCard label={t("appointments.statCancelledNoShow")} value={stats.cancelledOrNoShowAppointments} />
        </div>
      )}

      <div className="appointments-view-tabs">
        <Button
          type="button"
          variant={activeTab === "calendar" ? "primary" : "secondary"}
          onClick={() => setActiveTab("calendar")}
        >
          {t("appointments.calendarView")}
        </Button>
        <Button
          type="button"
          variant={activeTab === "list" ? "primary" : "secondary"}
          onClick={() => setActiveTab("list")}
        >
          {t("appointments.listView")}
        </Button>
      </div>

      {activeTab === "calendar" && (
        <Card>
          <AppointmentsCalendarView
            doctors={doctors}
            isDoctorRole={user?.role === "Doctor"}
            canManageAppointments={canManageAppointments}
            onEdit={openEditModalFor}
          />
        </Card>
      )}

      {activeTab === "list" && (
      <Card>
        {patientIdFilter && (
          <div className="appointments-patient-filter-banner">
            <span>
              {t("appointments.showingFor")}{" "}
              <strong>{patients.find((p) => p.id === patientIdFilter)?.fullName ?? t("appointments.selectedPatient")}</strong>
            </span>
            <Button variant="ghost" onClick={clearFilters}>
              {t("common.clear")}
            </Button>
          </div>
        )}
        <div className="appointments-filters">
          <Input
            placeholder={t("appointments.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPageNumber(1);
            }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPageNumber(1);
            }}
          >
            <option value="all">{t("appointments.allStatuses")}</option>
            {ALL_APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(APPOINTMENT_STATUS_LABEL_KEYS[status])}
              </option>
            ))}
          </Select>
          <Select
            value={doctorFilter}
            onChange={(e) => {
              setDoctorFilter(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="all">{t("appointments.allDoctors")}</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant={dateFilter === todayIso() ? "primary" : "secondary"}
            onClick={() => {
              setDateFilter(todayIso());
              setPageNumber(1);
            }}
          >
            {t("appointments.today")}
          </Button>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label={t("appointments.loading")} />}

        {view.status === "error" && (
          <EmptyState title={t("appointments.unableToLoad")} description={view.message} />
        )}

        {view.status === "loaded" && appointments.length === 0 && (
          <EmptyState
            title={t("appointments.noneFoundTitle")}
            description={t("appointments.noneFoundDescription")}
          />
        )}

        {view.status === "loaded" && appointments.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("table.date")}</th>
                    <th>{t("table.time")}</th>
                    <th>{t("table.patient")}</th>
                    <th>{t("table.phone")}</th>
                    <th>{t("table.doctor")}</th>
                    <th>{t("table.service")}</th>
                    <th>{t("table.status")}</th>
                    <th aria-label={t("common.actions")} />
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{formatDate(appointment.appointmentDate)}</td>
                      <td>
                        {appointment.startTime} - {appointment.endTime}
                      </td>
                      <td>{appointment.patientFullName}</td>
                      <td>{appointment.patientPhoneNumber}</td>
                      <td>{appointment.doctorFullName}</td>
                      <td>{appointment.serviceName}</td>
                      <td>
                        <StatusBadge
                          label={t(APPOINTMENT_STATUS_LABEL_KEYS[appointment.status])}
                          variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
                        />
                      </td>
                      <td className="appointments-table-actions">
                        <Button variant="ghost" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          {t("common.view")}
                        </Button>
                        {canManageAppointments && (
                          <Button variant="ghost" onClick={() => openEditModalFor(appointment.id)}>
                            {t("common.edit")}
                          </Button>
                        )}
                        {canManageAppointments && (
                          <Button variant="ghost" onClick={() => setRemindingAppointment(appointment)}>
                            {t("whatsapp.reminderButton")}
                          </Button>
                        )}
                        {allowedStatuses.length > 0 && (
                          <Select
                            aria-label={t("appointments.changeStatus")}
                            className="appointments-status-select"
                            value={appointment.status}
                            onChange={(e) => handleStatusChange(appointment, e.target.value as AppointmentStatus)}
                          >
                            <option value={appointment.status}>{t(APPOINTMENT_STATUS_LABEL_KEYS[appointment.status])}</option>
                            {allowedStatuses
                              .filter((status) => status !== appointment.status)
                              .map((status) => (
                                <option key={status} value={status}>
                                  {t(APPOINTMENT_STATUS_LABEL_KEYS[status])}
                                </option>
                              ))}
                          </Select>
                        )}
                        {canManageAppointments && appointment.status !== "Cancelled" && (
                          <Button variant="danger" onClick={() => openCancelModal(appointment)}>
                            {t("appointments.cancel")}
                          </Button>
                        )}
                        {canManageVisits && (appointment.status === "Arrived" || appointment.status === "InProgress") && (
                          <Button variant="ghost" onClick={() => handleOpenVisit(appointment.id)}>
                            {t("appointments.visit")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="appointments-result-count">{t("appointments.countFound", { count: totalCount })}</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        title={editingAppointment ? t("appointments.editTitle") : t("appointments.addTitle")}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <Select
            label={t("appointments.patient")}
            required
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          >
            <option value="" disabled>
              {t("appointments.selectPatient")}
            </option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName} ({patient.phoneNumber})
              </option>
            ))}
          </Select>

          <Select
            label={t("appointments.doctor")}
            required
            value={form.doctorProfileId}
            onChange={(e) => setForm({ ...form, doctorProfileId: e.target.value })}
          >
            <option value="" disabled>
              {t("appointments.selectDoctor")}
            </option>
            {activeDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {t("appointments.doctorOption", { name: doctor.fullName, specialty: doctor.specialty })}
              </option>
            ))}
          </Select>

          <Select
            label={t("appointments.service")}
            required
            value={form.dentalServiceId}
            onChange={(e) => handleServiceChange(e.target.value)}
          >
            <option value="" disabled>
              {t("appointments.selectService")}
            </option>
            {activeServices.map((service) => (
              <option key={service.id} value={service.id}>
                {t("appointments.serviceOption", { name: service.name, duration: service.durationMinutes })}
              </option>
            ))}
          </Select>

          <Input
            label={t("appointments.appointmentDate")}
            type="date"
            required
            min={todayIso()}
            value={form.appointmentDate}
            onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
          />

          <Input
            label={t("appointments.startTime")}
            type="time"
            required
            value={form.startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
          />

          <Input
            label={t("appointments.endTime")}
            type="time"
            required
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />

          <Input
            label={t("appointments.reason")}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />

          <Textarea
            label={t("appointments.notes")}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {formError && <p className="appointments-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

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

      <Modal
        isOpen={cancellingAppointment !== null}
        title={t("appointments.cancelTitle")}
        onClose={closeCancelModal}
      >
        {cancellingAppointment && (
          <div className="modal-form">
            <p>
              {t("appointments.cancelConfirm", {
                patient: cancellingAppointment.patientFullName,
                date: formatDate(cancellingAppointment.appointmentDate),
                time: cancellingAppointment.startTime,
              })}
            </p>
            <Textarea
              label={t("appointments.cancellationReason")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeCancelModal} disabled={isCancelling}>
                {t("appointments.keepAppointment")}
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmCancel} disabled={isCancelling}>
                {isCancelling ? t("appointments.cancelling") : t("appointments.cancelAppointment")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
