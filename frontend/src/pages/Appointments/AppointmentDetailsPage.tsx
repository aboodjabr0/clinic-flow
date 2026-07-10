import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Textarea } from "../../components/common/Textarea";
import { Modal } from "../../components/common/Modal";
import { CreateInvoiceModal } from "../../components/invoices/CreateInvoiceModal";
import { InvoiceSummaryCard } from "../../components/invoices/InvoiceSummaryCard";
import { appointmentsApi } from "../../api/appointmentsApi";
import { visitsApi } from "../../api/visitsApi";
import { invoicesApi } from "../../api/invoicesApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import { APPOINTMENT_STATUS_LABEL_KEYS, APPOINTMENT_STATUS_VARIANTS } from "../../utils/appointment";
import { VISIT_STATUS_LABEL_KEYS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
import type { Appointment } from "../../types/appointment";
import type { Visit } from "../../types/visit";
import type { Invoice } from "../../types/invoice";
import "./AppointmentDetailsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type VisitViewState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "found"; visit: Visit }
  | { status: "error"; message: string };

type InvoiceViewState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "found"; invoice: Invoice }
  | { status: "error"; message: string };

const STARTABLE_APPOINTMENT_STATUSES = ["Scheduled", "Arrived", "InProgress"];

export function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const canManageVisits = hasAnyRole(["Admin", "Doctor"]);
  const canManageInvoices = hasAnyRole(["Admin", "Receptionist"]);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [visitView, setVisitView] = useState<VisitViewState>({ status: "loading" });
  const [invoiceView, setInvoiceView] = useState<InvoiceViewState>({ status: "loading" });
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const loadAppointment = useCallback(async () => {
    if (!id) return;
    setView({ status: "loading" });
    try {
      const response = await appointmentsApi.getAppointmentById(id);
      setAppointment(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("appointmentDetails.errorReachApi");
      setView({ status: "error", message });
    }
  }, [id, t]);

  const loadVisit = useCallback(async () => {
    if (!id) return;
    setVisitView({ status: "loading" });
    try {
      const response = await visitsApi.getVisitByAppointmentId(id);
      setVisitView({ status: "found", visit: response.data });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setVisitView({ status: "none" });
        return;
      }
      setVisitView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("appointmentDetails.errorLoadVisit"),
      });
    }
  }, [id, t]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setInvoiceView({ status: "loading" });
    try {
      const response = await invoicesApi.getInvoiceByAppointmentId(id);
      setInvoiceView({ status: "found", invoice: response.data });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setInvoiceView({ status: "none" });
        return;
      }
      setInvoiceView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("appointmentDetails.errorLoadInvoice"),
      });
    }
  }, [id, t]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  function openStartModal() {
    setChiefComplaint("");
    setStartError(null);
    setIsStartModalOpen(true);
  }

  function closeStartModal() {
    if (isStarting) return;
    setIsStartModalOpen(false);
  }

  async function handleStartVisit(event: React.FormEvent) {
    event.preventDefault();
    if (!id) return;

    setIsStarting(true);
    setStartError(null);
    try {
      const response = await visitsApi.startVisit(id, { chiefComplaint: chiefComplaint.trim() || undefined });
      setIsStartModalOpen(false);
      navigate(`/visits/${response.data.id}`);
    } catch (error) {
      setStartError(error instanceof ApiError ? error.message : t("appointmentDetails.errorStartVisit"));
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("appointmentDetails.title")}
        subtitle={t("appointmentDetails.subtitle")}
        actions={
          <Button variant="secondary" onClick={() => navigate("/appointments")}>
            {t("appointmentDetails.backToAppointments")}
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label={t("appointmentDetails.loading")} />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title={t("appointmentDetails.unableToLoad")} description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && appointment && (
        <div className="appointment-details-stack">
          <Card>
            <div className="appointment-details-header">
              <div>
                <h2 className="appointment-details-title">
                  {t("appointmentDetails.serviceWithDoctor", {
                    service: appointment.serviceName,
                    doctor: appointment.doctorFullName,
                  })}
                </h2>
                <p className="appointment-details-subtitle">
                  {formatDate(appointment.appointmentDate)} · {appointment.startTime} - {appointment.endTime}
                </p>
              </div>
              <StatusBadge
                label={t(APPOINTMENT_STATUS_LABEL_KEYS[appointment.status])}
                variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
              />
            </div>

            <div className="appointment-summary-meta">
              <section className="appointment-meta-group">
                <h3 className="appointment-meta-group-title">{t("appointmentDetails.sectionPatient")}</h3>
                <div className="appointment-meta-list">
                  <div className="appointment-details-field">
                    <span className="appointment-details-label">{t("appointmentDetails.name")}</span>
                    <span className="appointment-details-value">{appointment.patientFullName}</span>
                  </div>
                  <div className="appointment-details-field">
                    <span className="appointment-details-label">{t("appointmentDetails.phone")}</span>
                    <span className="appointment-details-value">{appointment.patientPhoneNumber}</span>
                  </div>
                </div>
              </section>

              <section className="appointment-meta-group">
                <h3 className="appointment-meta-group-title">{t("appointmentDetails.sectionAppointment")}</h3>
                <div className="appointment-meta-list">
                  <div className="appointment-details-field">
                    <span className="appointment-details-label">{t("appointmentDetails.name")}</span>
                    <span className="appointment-details-value">{appointment.doctorFullName}</span>
                  </div>
                  <div className="appointment-details-field">
                    <span className="appointment-details-label">{t("table.service")}</span>
                    <span className="appointment-details-value">
                      {appointment.serviceName} ({appointment.servicePrice.toFixed(2)})
                    </span>
                  </div>
                  <div className="appointment-details-field">
                    <span className="appointment-details-label">{t("table.created")}</span>
                    <span className="appointment-details-value">{formatDate(appointment.createdAtUtc)}</span>
                  </div>
                  <div className="appointment-details-field">
                    <span className="appointment-details-label">{t("appointmentDetails.lastUpdated")}</span>
                    <span className="appointment-details-value">{formatDate(appointment.updatedAtUtc)}</span>
                  </div>
                </div>
              </section>
            </div>
          </Card>

          <div className="appointment-details-notes-grid">
            <Card title={t("appointmentDetails.reason")}>
              <p className="appointment-details-notes">{appointment.reason ?? t("appointmentDetails.noReason")}</p>
            </Card>

            <Card title={t("appointmentDetails.notes")}>
              <p className="appointment-details-notes">{appointment.notes ?? t("appointmentDetails.noNotes")}</p>
            </Card>
          </div>

          {appointment.status === "Cancelled" && (
            <Card title={t("appointmentDetails.cancellationReason")}>
              <p className="appointment-details-notes">
                {appointment.cancellationReason ?? t("appointmentDetails.noCancellationReason")}
              </p>
            </Card>
          )}

          <div className="appointment-details-placeholders">
            <Card
              title={t("appointmentDetails.visitRecord")}
              actions={
                visitView.status === "none" && canManageVisits && STARTABLE_APPOINTMENT_STATUSES.includes(appointment.status) ? (
                  <Button variant="secondary" onClick={openStartModal}>
                    {t("appointmentDetails.startVisit")}
                  </Button>
                ) : undefined
              }
            >
              {visitView.status === "loading" && <LoadingState label={t("appointmentDetails.loadingVisitRecord")} />}

              {visitView.status === "error" && (
                <EmptyState title={t("appointmentDetails.unableToLoadVisitRecord")} description={visitView.message} />
              )}

              {visitView.status === "found" && (
                <div className="appointment-details-visit-summary">
                  <StatusBadge
                    label={t(VISIT_STATUS_LABEL_KEYS[visitView.visit.status])}
                    variant={VISIT_STATUS_VARIANTS[visitView.visit.status]}
                  />
                  <p className="appointment-details-notes">
                    {visitView.visit.chiefComplaint ?? t("appointmentDetails.noChiefComplaint")}
                  </p>
                  <Button variant="ghost" onClick={() => navigate(`/visits/${visitView.visit.id}`)}>
                    {t("appointmentDetails.viewVisit")}
                  </Button>
                </div>
              )}

              {visitView.status === "none" && appointment.status === "Completed" && (
                <EmptyState
                  title={t("appointmentDetails.noVisitRecordTitle")}
                  description={t("appointmentDetails.noVisitRecordDescription")}
                />
              )}

              {visitView.status === "none" && appointment.status !== "Completed" && (
                <EmptyState
                  title={t("appointmentDetails.noVisitStartedTitle")}
                  description={
                    canManageVisits && STARTABLE_APPOINTMENT_STATUSES.includes(appointment.status)
                      ? t("appointmentDetails.noVisitStartedDescription")
                      : t("appointmentDetails.noVisitStartedFallback")
                  }
                />
              )}
            </Card>
            <Card
              title={t("appointmentDetails.invoice")}
              actions={
                invoiceView.status === "none" && canManageInvoices ? (
                  <Button variant="secondary" onClick={() => setIsCreateInvoiceModalOpen(true)}>
                    {t("appointmentDetails.createInvoice")}
                  </Button>
                ) : undefined
              }
            >
              {invoiceView.status === "loading" && <LoadingState label={t("appointmentDetails.loadingInvoice")} />}

              {invoiceView.status === "error" && (
                <EmptyState title={t("appointmentDetails.unableToLoadInvoice")} description={invoiceView.message} />
              )}

              {invoiceView.status === "found" && <InvoiceSummaryCard invoice={invoiceView.invoice} />}

              {invoiceView.status === "none" && (
                <EmptyState
                  title={t("appointmentDetails.noInvoiceTitle")}
                  description={
                    canManageInvoices
                      ? t("appointmentDetails.noInvoiceDescription")
                      : t("appointmentDetails.noInvoiceFallback")
                  }
                />
              )}
            </Card>
          </div>
        </div>
      )}

      {appointment && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceModalOpen}
          onClose={() => setIsCreateInvoiceModalOpen(false)}
          onCreated={(invoice) => {
            setIsCreateInvoiceModalOpen(false);
            setInvoiceView({ status: "found", invoice });
          }}
          prefill={{
            patientId: appointment.patientId,
            patientName: appointment.patientFullName,
            appointmentId: appointment.id,
            visitId: visitView.status === "found" ? visitView.visit.id : undefined,
            serviceName: appointment.serviceName,
            subtotalAmount: appointment.servicePrice,
          }}
        />
      )}

      <Modal isOpen={isStartModalOpen} title={t("appointmentDetails.startVisitModalTitle")} onClose={closeStartModal}>
        <form className="modal-form" onSubmit={handleStartVisit}>
          <p className="appointment-details-notes">{t("appointmentDetails.startVisitModalText")}</p>
          <Textarea
            label={t("appointmentDetails.chiefComplaintOptional")}
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
          />
          {startError && <p className="appointment-details-form-error">{startError}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeStartModal} disabled={isStarting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isStarting}>
              {isStarting ? t("appointmentDetails.starting") : t("appointmentDetails.startVisit")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
