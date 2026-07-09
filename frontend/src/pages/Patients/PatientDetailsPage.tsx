import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { patientsApi } from "../../api/patientsApi";
import { appointmentsApi } from "../../api/appointmentsApi";
import { visitsApi } from "../../api/visitsApi";
import { invoicesApi } from "../../api/invoicesApi";
import { ApiError } from "../../api/apiClient";
import { calculateAge, formatDate, GENDER_LABELS } from "../../utils/patient";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_VARIANTS } from "../../utils/appointment";
import { VISIT_STATUS_LABELS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS, formatMoney } from "../../utils/invoice";
import type { Patient } from "../../types/patient";
import type { AppointmentListItem } from "../../types/appointment";
import type { VisitListItem } from "../../types/visit";
import type { InvoiceListItem } from "../../types/invoice";
import "./PatientDetailsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [visits, setVisits] = useState<VisitListItem[]>([]);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const loadPatient = useCallback(async () => {
    if (!id) return;
    setView({ status: "loading" });
    try {
      const response = await patientsApi.getPatientById(id);
      setPatient(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [id]);

  const loadAppointments = useCallback(async () => {
    if (!id) return;
    try {
      const response = await appointmentsApi.getPatientAppointments(id);
      setAppointments(response.data);
      setAppointmentsError(null);
    } catch (error) {
      setAppointmentsError(error instanceof ApiError ? error.message : "Unable to load appointments.");
    }
  }, [id]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  const loadVisits = useCallback(async () => {
    if (!id) return;
    try {
      const response = await visitsApi.getPatientVisits(id);
      setVisits(response.data);
      setVisitsError(null);
    } catch (error) {
      setVisitsError(error instanceof ApiError ? error.message : "Unable to load visits.");
    }
  }, [id]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const loadInvoices = useCallback(async () => {
    if (!id) return;
    try {
      const response = await invoicesApi.getPatientInvoices(id);
      setInvoices(response.data);
      setInvoicesError(null);
    } catch (error) {
      setInvoicesError(error instanceof ApiError ? error.message : "Unable to load invoices.");
    }
  }, [id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <>
      <PageHeader
        title="Patient Details"
        subtitle="View patient information and history."
        actions={
          <Button variant="secondary" onClick={() => navigate("/patients")}>
            Back to Patients
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label="Loading patient..." />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title="Unable to load patient" description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && patient && (
        <div className="patient-details-stack">
          <Card>
            <div className="patient-details-header">
              <div>
                <h2 className="patient-details-name">{patient.fullName}</h2>
                <p className="patient-details-subtitle">
                  {GENDER_LABELS[patient.gender]}
                  {calculateAge(patient.dateOfBirth) !== null && ` · ${calculateAge(patient.dateOfBirth)} years old`}
                </p>
              </div>
              <StatusBadge
                label={patient.isActive ? "Active" : "Inactive"}
                variant={patient.isActive ? "success" : "neutral"}
              />
            </div>

            <div className="patient-details-grid">
              <div className="patient-details-field">
                <span className="patient-details-label">Phone number</span>
                <span className="patient-details-value">{patient.phoneNumber}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">Email</span>
                <span className="patient-details-value">{patient.email ?? "—"}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">Date of birth</span>
                <span className="patient-details-value">{formatDate(patient.dateOfBirth)}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">Address</span>
                <span className="patient-details-value">{patient.address ?? "—"}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">Emergency contact</span>
                <span className="patient-details-value">
                  {patient.emergencyContactName ?? "—"}
                  {patient.emergencyContactPhone ? ` (${patient.emergencyContactPhone})` : ""}
                </span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">Created</span>
                <span className="patient-details-value">{formatDate(patient.createdAtUtc)}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">Last updated</span>
                <span className="patient-details-value">{formatDate(patient.updatedAtUtc)}</span>
              </div>
            </div>
          </Card>

          <Card title="Allergies">
            <p className="patient-details-notes">{patient.allergies ?? "No known allergies recorded."}</p>
          </Card>

          <Card title="Medical Notes">
            <p className="patient-details-notes">{patient.medicalNotes ?? "No medical notes recorded."}</p>
          </Card>

          <Card
            title="Appointments"
            actions={
              <Button variant="ghost" onClick={() => navigate(`/appointments?patientId=${id}`)}>
                View all
              </Button>
            }
          >
            {appointmentsError && <EmptyState title="Unable to load appointments" description={appointmentsError} />}

            {!appointmentsError && appointments.length === 0 && (
              <EmptyState title="No appointments yet" description="This patient has no scheduled or past appointments." />
            )}

            {!appointmentsError && appointments.length > 0 && (
              <div className="patient-details-appointments">
                {appointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="patient-details-appointment-row">
                    <div>
                      <span className="patient-details-appointment-date">
                        {formatDate(appointment.appointmentDate)} · {appointment.startTime} - {appointment.endTime}
                      </span>
                      <span className="patient-details-appointment-meta">
                        {appointment.serviceName} with {appointment.doctorFullName}
                      </span>
                    </div>
                    <StatusBadge
                      label={APPOINTMENT_STATUS_LABELS[appointment.status]}
                      variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Visit History"
            actions={
              <Button variant="ghost" onClick={() => navigate(`/visits?patientId=${id}`)}>
                View all
              </Button>
            }
          >
            {visitsError && <EmptyState title="Unable to load visits" description={visitsError} />}

            {!visitsError && visits.length === 0 && (
              <EmptyState title="No visits yet" description="This patient has no recorded visits." />
            )}

            {!visitsError && visits.length > 0 && (
              <div className="patient-details-appointments">
                {visits.slice(0, 5).map((visit) => (
                  <div
                    key={visit.id}
                    className="patient-details-appointment-row patient-details-visit-row"
                    onClick={() => navigate(`/visits/${visit.id}`)}
                  >
                    <div>
                      <span className="patient-details-appointment-date">{formatDate(visit.visitDate)}</span>
                      <span className="patient-details-appointment-meta">
                        {visit.serviceName} with {visit.doctorFullName}
                        {visit.followUpDate ? ` · Follow-up: ${formatDate(visit.followUpDate)}` : ""}
                      </span>
                    </div>
                    <StatusBadge
                      label={VISIT_STATUS_LABELS[visit.status]}
                      variant={VISIT_STATUS_VARIANTS[visit.status]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Invoices"
            actions={
              <Button variant="ghost" onClick={() => navigate(`/invoices?patientId=${id}`)}>
                View all
              </Button>
            }
          >
            {invoicesError && <EmptyState title="Unable to load invoices" description={invoicesError} />}

            {!invoicesError && invoices.length === 0 && (
              <EmptyState title="No invoices yet" description="This patient has no invoices." />
            )}

            {!invoicesError && invoices.length > 0 && (
              <div className="patient-details-appointments">
                {invoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="patient-details-appointment-row patient-details-visit-row"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div>
                      <span className="patient-details-appointment-date">
                        {invoice.invoiceNumber} · {formatDate(invoice.issueDate)}
                      </span>
                      <span className="patient-details-appointment-meta">
                        Total {formatMoney(invoice.totalAmount)} · Remaining {formatMoney(invoice.remainingAmount)}
                        {invoice.serviceName ? ` · ${invoice.serviceName}` : ""}
                      </span>
                    </div>
                    <StatusBadge
                      label={PAYMENT_STATUS_LABELS[invoice.status]}
                      variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
