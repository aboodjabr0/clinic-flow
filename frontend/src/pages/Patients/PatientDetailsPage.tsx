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
import { useTranslation } from "../../i18n/useTranslation";
import { calculateAge, formatDate, GENDER_LABEL_KEYS } from "../../utils/patient";
import { APPOINTMENT_STATUS_LABEL_KEYS, APPOINTMENT_STATUS_VARIANTS } from "../../utils/appointment";
import { VISIT_STATUS_LABEL_KEYS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
import { PAYMENT_STATUS_LABEL_KEYS, PAYMENT_STATUS_VARIANTS, formatMoney } from "../../utils/invoice";
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
  const { t } = useTranslation();

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
      const message = error instanceof ApiError ? error.message : t("patientDetails.errorReachApi");
      setView({ status: "error", message });
    }
  }, [id, t]);

  const loadAppointments = useCallback(async () => {
    if (!id) return;
    try {
      const response = await appointmentsApi.getPatientAppointments(id);
      setAppointments(response.data);
      setAppointmentsError(null);
    } catch (error) {
      setAppointmentsError(error instanceof ApiError ? error.message : t("patientDetails.errorLoadAppointments"));
    }
  }, [id, t]);

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
      setVisitsError(error instanceof ApiError ? error.message : t("patientDetails.errorLoadVisits"));
    }
  }, [id, t]);

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
      setInvoicesError(error instanceof ApiError ? error.message : t("patientDetails.errorLoadInvoices"));
    }
  }, [id, t]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <>
      <PageHeader
        title={t("patientDetails.title")}
        subtitle={t("patientDetails.subtitle")}
        actions={
          <Button variant="secondary" onClick={() => navigate("/patients")}>
            {t("patientDetails.backToPatients")}
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label={t("patientDetails.loading")} />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title={t("patientDetails.unableToLoad")} description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && patient && (
        <div className="patient-details-stack">
          <Card>
            <div className="patient-details-header">
              <div>
                <h2 className="patient-details-name">{patient.fullName}</h2>
                <p className="patient-details-subtitle">
                  {t(GENDER_LABEL_KEYS[patient.gender])}
                  {calculateAge(patient.dateOfBirth) !== null &&
                    ` · ${calculateAge(patient.dateOfBirth)} ${t("patientDetails.yearsOld")}`}
                </p>
              </div>
              <StatusBadge
                label={patient.isActive ? t("common.active") : t("common.inactive")}
                variant={patient.isActive ? "success" : "neutral"}
              />
            </div>

            <div className="patient-details-grid">
              <div className="patient-details-field">
                <span className="patient-details-label">{t("patients.phoneNumber")}</span>
                <span className="patient-details-value">{patient.phoneNumber}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">{t("patients.email")}</span>
                <span className="patient-details-value">{patient.email ?? "—"}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">{t("patients.dateOfBirth")}</span>
                <span className="patient-details-value">{formatDate(patient.dateOfBirth)}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">{t("patients.address")}</span>
                <span className="patient-details-value">{patient.address ?? "—"}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">{t("patientDetails.emergencyContact")}</span>
                <span className="patient-details-value">
                  {patient.emergencyContactName ?? "—"}
                  {patient.emergencyContactPhone ? ` (${patient.emergencyContactPhone})` : ""}
                </span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">{t("table.created")}</span>
                <span className="patient-details-value">{formatDate(patient.createdAtUtc)}</span>
              </div>
              <div className="patient-details-field">
                <span className="patient-details-label">{t("patientDetails.lastUpdated")}</span>
                <span className="patient-details-value">{formatDate(patient.updatedAtUtc)}</span>
              </div>
            </div>
          </Card>

          <Card title={t("patientDetails.allergies")}>
            <p className="patient-details-notes">{patient.allergies ?? t("patientDetails.noAllergies")}</p>
          </Card>

          <Card title={t("patientDetails.medicalNotes")}>
            <p className="patient-details-notes">{patient.medicalNotes ?? t("patientDetails.noMedicalNotes")}</p>
          </Card>

          <Card
            title={t("patientDetails.appointments")}
            actions={
              <Button variant="ghost" onClick={() => navigate(`/appointments?patientId=${id}`)}>
                {t("patientDetails.viewAll")}
              </Button>
            }
          >
            {appointmentsError && (
              <EmptyState title={t("patientDetails.unableToLoadAppointments")} description={appointmentsError} />
            )}

            {!appointmentsError && appointments.length === 0 && (
              <EmptyState
                title={t("patientDetails.noAppointmentsTitle")}
                description={t("patientDetails.noAppointmentsDescription")}
              />
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
                        {t("patientDetails.serviceWithDoctor", {
                          service: appointment.serviceName,
                          doctor: appointment.doctorFullName,
                        })}
                      </span>
                    </div>
                    <StatusBadge
                      label={t(APPOINTMENT_STATUS_LABEL_KEYS[appointment.status])}
                      variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t("patientDetails.visitHistory")}
            actions={
              <Button variant="ghost" onClick={() => navigate(`/visits?patientId=${id}`)}>
                {t("patientDetails.viewAll")}
              </Button>
            }
          >
            {visitsError && <EmptyState title={t("patientDetails.unableToLoadVisits")} description={visitsError} />}

            {!visitsError && visits.length === 0 && (
              <EmptyState
                title={t("patientDetails.noVisitsTitle")}
                description={t("patientDetails.noVisitsDescription")}
              />
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
                        {t("patientDetails.serviceWithDoctor", {
                          service: visit.serviceName,
                          doctor: visit.doctorFullName,
                        })}
                        {visit.followUpDate
                          ? ` · ${t("patientDetails.followUpDate", { date: formatDate(visit.followUpDate) })}`
                          : ""}
                      </span>
                    </div>
                    <StatusBadge
                      label={t(VISIT_STATUS_LABEL_KEYS[visit.status])}
                      variant={VISIT_STATUS_VARIANTS[visit.status]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t("patientDetails.invoices")}
            actions={
              <Button variant="ghost" onClick={() => navigate(`/invoices?patientId=${id}`)}>
                {t("patientDetails.viewAll")}
              </Button>
            }
          >
            {invoicesError && <EmptyState title={t("patientDetails.unableToLoadInvoices")} description={invoicesError} />}

            {!invoicesError && invoices.length === 0 && (
              <EmptyState
                title={t("patientDetails.noInvoicesTitle")}
                description={t("patientDetails.noInvoicesDescription")}
              />
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
                        {t("patientDetails.totalRemaining", {
                          total: formatMoney(invoice.totalAmount),
                          remaining: formatMoney(invoice.remainingAmount),
                        })}
                        {invoice.serviceName ? ` · ${invoice.serviceName}` : ""}
                      </span>
                    </div>
                    <StatusBadge
                      label={t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}
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
