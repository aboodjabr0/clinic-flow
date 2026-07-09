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
import { StatCard } from "../../components/dashboard/StatCard";
import { appointmentsApi } from "../../api/appointmentsApi";
import { visitsApi } from "../../api/visitsApi";
import { doctorsApi } from "../../api/doctorsApi";
import { dentalServicesApi } from "../../api/dentalServicesApi";
import { patientsApi } from "../../api/patientsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/patient";
import {
  ALL_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageAppointments = hasAnyRole(["Admin", "Receptionist"]);
  const canManageVisits = hasAnyRole(["Admin", "Doctor"]);
  const allowedStatuses = user ? getAllowedStatusTransitions(user.role) : [];
  const patientIdFilter = searchParams.get("patientId");

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
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [search, dateFilter, doctorFilter, statusFilter, patientIdFilter, pageNumber]);

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
    loadAppointments();
  }, [loadAppointments]);

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
        message: error instanceof ApiError ? error.message : "Unable to load appointment.",
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
      setFormError("Patient, doctor, and service are required.");
      return;
    }
    if (!form.appointmentDate) {
      setFormError("Appointment date is required.");
      return;
    }
    if (!form.startTime || !form.endTime) {
      setFormError("Start time and end time are required.");
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError("End time must be after start time.");
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
      setFormError(error instanceof ApiError ? error.message : "Unable to save appointment.");
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
        message: error instanceof ApiError ? error.message : "Unable to update appointment status.",
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
        message: error instanceof ApiError ? error.message : "Unable to cancel appointment.",
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
        setView({ status: "error", message: error instanceof ApiError ? error.message : "Unable to load visit." });
        return;
      }
      try {
        const startResponse = await visitsApi.startVisit(appointmentId, {});
        navigate(`/visits/${startResponse.data.id}`);
      } catch (startError) {
        setView({
          status: "error",
          message: startError instanceof ApiError ? startError.message : "Unable to start visit.",
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
        title="Appointments"
        subtitle="Schedule and track patient appointments."
        actions={canManageAppointments ? <Button onClick={openCreateModal}>Add Appointment</Button> : undefined}
      />

      {stats && (
        <div className="appointments-stats">
          <StatCard label="Total" value={stats.totalAppointments} />
          <StatCard label="Today" value={stats.todayAppointments} />
          <StatCard label="Scheduled" value={stats.scheduledAppointments} />
          <StatCard label="Completed" value={stats.completedAppointments} />
          <StatCard label="Cancelled / No-show" value={stats.cancelledOrNoShowAppointments} />
        </div>
      )}

      <Card>
        {patientIdFilter && (
          <div className="appointments-patient-filter-banner">
            <span>
              Showing appointments for{" "}
              <strong>{patients.find((p) => p.id === patientIdFilter)?.fullName ?? "selected patient"}</strong>
            </span>
            <Button variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
        <div className="appointments-filters">
          <Input
            placeholder="Search by patient, doctor, service..."
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
            <option value="all">All statuses</option>
            {ALL_APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPOINTMENT_STATUS_LABELS[status]}
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
            <option value="all">All doctors</option>
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
            Today
          </Button>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label="Loading appointments..." />}

        {view.status === "error" && (
          <EmptyState title="Unable to load appointments" description={view.message} />
        )}

        {view.status === "loaded" && appointments.length === 0 && (
          <EmptyState
            title="No appointments found"
            description="Try adjusting your search or filters, or schedule a new appointment."
          />
        )}

        {view.status === "loaded" && appointments.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Doctor</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
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
                          label={APPOINTMENT_STATUS_LABELS[appointment.status]}
                          variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
                        />
                      </td>
                      <td className="appointments-table-actions">
                        <Button variant="ghost" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          View
                        </Button>
                        {canManageAppointments && (
                          <Button variant="ghost" onClick={() => openEditModalFor(appointment.id)}>
                            Edit
                          </Button>
                        )}
                        {allowedStatuses.length > 0 && (
                          <Select
                            aria-label="Change status"
                            className="appointments-status-select"
                            value={appointment.status}
                            onChange={(e) => handleStatusChange(appointment, e.target.value as AppointmentStatus)}
                          >
                            <option value={appointment.status}>{APPOINTMENT_STATUS_LABELS[appointment.status]}</option>
                            {allowedStatuses
                              .filter((status) => status !== appointment.status)
                              .map((status) => (
                                <option key={status} value={status}>
                                  {APPOINTMENT_STATUS_LABELS[status]}
                                </option>
                              ))}
                          </Select>
                        )}
                        {canManageAppointments && appointment.status !== "Cancelled" && (
                          <Button variant="danger" onClick={() => openCancelModal(appointment)}>
                            Cancel
                          </Button>
                        )}
                        {canManageVisits && (appointment.status === "Arrived" || appointment.status === "InProgress") && (
                          <Button variant="ghost" onClick={() => handleOpenVisit(appointment.id)}>
                            Visit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="appointments-result-count">{totalCount} appointment(s) found</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={editingAppointment ? "Edit Appointment" : "Add Appointment"}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <Select
            label="Patient"
            required
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          >
            <option value="" disabled>
              Select patient
            </option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName} ({patient.phoneNumber})
              </option>
            ))}
          </Select>

          <Select
            label="Doctor"
            required
            value={form.doctorProfileId}
            onChange={(e) => setForm({ ...form, doctorProfileId: e.target.value })}
          >
            <option value="" disabled>
              Select doctor
            </option>
            {activeDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName} — {doctor.specialty}
              </option>
            ))}
          </Select>

          <Select
            label="Service"
            required
            value={form.dentalServiceId}
            onChange={(e) => handleServiceChange(e.target.value)}
          >
            <option value="" disabled>
              Select service
            </option>
            {activeServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </option>
            ))}
          </Select>

          <Input
            label="Appointment date"
            type="date"
            required
            min={todayIso()}
            value={form.appointmentDate}
            onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
          />

          <Input
            label="Start time"
            type="time"
            required
            value={form.startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
          />

          <Input
            label="End time"
            type="time"
            required
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />

          <Input
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {formError && <p className="appointments-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={cancellingAppointment !== null}
        title="Cancel Appointment"
        onClose={closeCancelModal}
      >
        {cancellingAppointment && (
          <div className="modal-form">
            <p>
              Cancel the appointment for <strong>{cancellingAppointment.patientFullName}</strong> on{" "}
              {formatDate(cancellingAppointment.appointmentDate)} at {cancellingAppointment.startTime}?
            </p>
            <Textarea
              label="Cancellation reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeCancelModal} disabled={isCancelling}>
                Keep Appointment
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmCancel} disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Cancel Appointment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
