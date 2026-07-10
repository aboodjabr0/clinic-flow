import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Textarea } from "../../components/common/Textarea";
import { Modal } from "../../components/common/Modal";
import { CreateInvoiceModal } from "../../components/invoices/CreateInvoiceModal";
import { InvoiceSummaryCard } from "../../components/invoices/InvoiceSummaryCard";
import { visitsApi } from "../../api/visitsApi";
import { invoicesApi } from "../../api/invoicesApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import { VISIT_STATUS_LABEL_KEYS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
import type { UpdateVisitRequest, Visit } from "../../types/visit";
import type { Invoice } from "../../types/invoice";
import "./VisitDetailsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type InvoiceViewState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "found"; invoice: Invoice }
  | { status: "error"; message: string };

interface VisitFormState {
  chiefComplaint: string;
  diagnosisNote: string;
  treatmentNote: string;
  toothNumbers: string;
  prescriptionNote: string;
  followUpDate: string;
  internalNotes: string;
}

function fillFormFromVisit(visit: Visit): VisitFormState {
  return {
    chiefComplaint: visit.chiefComplaint ?? "",
    diagnosisNote: visit.diagnosisNote ?? "",
    treatmentNote: visit.treatmentNote ?? "",
    toothNumbers: visit.toothNumbers ?? "",
    prescriptionNote: visit.prescriptionNote ?? "",
    followUpDate: visit.followUpDate ?? "",
    internalNotes: visit.internalNotes ?? "",
  };
}

export function VisitDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const canManageVisits = hasAnyRole(["Admin", "Doctor"]);
  const canManageInvoices = hasAnyRole(["Admin", "Receptionist"]);

  const [visit, setVisit] = useState<Visit | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });
  const [invoiceView, setInvoiceView] = useState<InvoiceViewState>({ status: "loading" });
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"edit" | "complete">("edit");
  const [form, setForm] = useState<VisitFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadVisit = useCallback(async () => {
    if (!id) return;
    setView({ status: "loading" });
    try {
      const response = await visitsApi.getVisitById(id);
      setVisit(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("visitDetails.errorReachApi");
      setView({ status: "error", message });
    }
  }, [id, t]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setInvoiceView({ status: "loading" });
    try {
      const response = await invoicesApi.getInvoiceByVisitId(id);
      setInvoiceView({ status: "found", invoice: response.data });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setInvoiceView({ status: "none" });
        return;
      }
      setInvoiceView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("visitDetails.errorLoadInvoice"),
      });
    }
  }, [id, t]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  function openModal(mode: "edit" | "complete") {
    if (!visit) return;
    setModalMode(mode);
    setForm(fillFormFromVisit(visit));
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!visit || !form) return;

    const payload: UpdateVisitRequest = {
      chiefComplaint: form.chiefComplaint.trim() || undefined,
      diagnosisNote: form.diagnosisNote.trim() || undefined,
      treatmentNote: form.treatmentNote.trim() || undefined,
      toothNumbers: form.toothNumbers.trim() || undefined,
      prescriptionNote: form.prescriptionNote.trim() || undefined,
      followUpDate: form.followUpDate || undefined,
      internalNotes: form.internalNotes.trim() || undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (modalMode === "complete") {
        await visitsApi.completeVisit(visit.id, payload);
      } else {
        await visitsApi.updateVisit(visit.id, payload);
      }
      setIsModalOpen(false);
      await loadVisit();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("visitDetails.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("visitDetails.title")}
        subtitle={t("visitDetails.subtitle")}
        actions={
          <Button variant="secondary" onClick={() => navigate("/visits")}>
            {t("visitDetails.backToVisits")}
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label={t("visitDetails.loading")} />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title={t("visitDetails.unableToLoad")} description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && visit && (
        <div className="visit-details-stack">
          <Card
            actions={
              canManageVisits ? (
                <div className="visit-details-actions">
                  <Button variant="secondary" onClick={() => openModal("edit")}>
                    {t("common.edit")}
                  </Button>
                  {visit.status === "InProgress" && (
                    <Button variant="primary" onClick={() => openModal("complete")}>
                      {t("visitDetails.completeVisit")}
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          >
            <div className="visit-details-header">
              <div>
                <h2 className="visit-details-title">
                  {t("visitDetails.serviceWithDoctor", { service: visit.serviceName, doctor: visit.doctorFullName })}
                </h2>
                <p className="visit-details-subtitle">
                  {t("visitDetails.visitDateAppointment", {
                    date: formatDate(visit.visitDate),
                    apptDate: formatDate(visit.appointmentDate),
                    startTime: visit.appointmentStartTime,
                    endTime: visit.appointmentEndTime,
                  })}
                </p>
              </div>
              <StatusBadge label={t(VISIT_STATUS_LABEL_KEYS[visit.status])} variant={VISIT_STATUS_VARIANTS[visit.status]} />
            </div>

            <div className="visit-details-grid">
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.patient")}</span>
                <span className="visit-details-value">{visit.patientFullName}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.patientPhone")}</span>
                <span className="visit-details-value">{visit.patientPhoneNumber}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.doctor")}</span>
                <span className="visit-details-value">{visit.doctorFullName}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.service")}</span>
                <span className="visit-details-value">{visit.serviceName}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.started")}</span>
                <span className="visit-details-value">
                  {visit.startedAtUtc ? formatDate(visit.startedAtUtc) : "—"}
                </span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.completed")}</span>
                <span className="visit-details-value">
                  {visit.completedAtUtc ? formatDate(visit.completedAtUtc) : "—"}
                </span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.created")}</span>
                <span className="visit-details-value">{formatDate(visit.createdAtUtc)}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">{t("visitDetails.lastUpdated")}</span>
                <span className="visit-details-value">{formatDate(visit.updatedAtUtc)}</span>
              </div>
            </div>
          </Card>

          <Card title={t("visitDetails.chiefComplaintTitle")}>
            <p className="visit-details-note-caption">{t("visitDetails.doctorEnteredNotes")}</p>
            <p className="visit-details-notes">{visit.chiefComplaint ?? t("visitDetails.noChiefComplaint")}</p>
          </Card>

          <Card title={t("visitDetails.dentalTreatment")}>
            <p className="visit-details-note-caption">{t("visitDetails.doctorEnteredNotes")}</p>
            <div className="visit-details-field">
              <span className="visit-details-label">{t("visits.diagnosisNote")}</span>
              <p className="visit-details-notes">{visit.diagnosisNote ?? t("visitDetails.noDiagnosisNote")}</p>
            </div>
            <div className="visit-details-field">
              <span className="visit-details-label">{t("visits.treatmentNote")}</span>
              <p className="visit-details-notes">{visit.treatmentNote ?? t("visitDetails.noTreatmentNote")}</p>
            </div>
            <div className="visit-details-field">
              <span className="visit-details-label">{t("visits.toothNumbers")}</span>
              <p className="visit-details-notes">{visit.toothNumbers ?? "—"}</p>
            </div>
          </Card>

          <Card title={t("visitDetails.prescriptionTitle")}>
            <p className="visit-details-note-caption">{t("visitDetails.prescriptionCaption")}</p>
            <p className="visit-details-notes">{visit.prescriptionNote ?? t("visitDetails.noPrescription")}</p>
          </Card>

          <Card title={t("visitDetails.followUpInternalNotes")}>
            <div className="visit-details-field">
              <span className="visit-details-label">{t("visits.followUpDate")}</span>
              <span className="visit-details-value">
                {visit.followUpDate ? formatDate(visit.followUpDate) : t("visitDetails.noFollowUp")}
              </span>
            </div>
            <div className="visit-details-field">
              <span className="visit-details-label">{t("visits.internalNotes")}</span>
              <p className="visit-details-notes">{visit.internalNotes ?? t("visitDetails.noInternalNotes")}</p>
            </div>
          </Card>

          <Card
            title={t("visitDetails.invoice")}
            actions={
              invoiceView.status === "none" && canManageInvoices ? (
                <Button variant="secondary" onClick={() => setIsCreateInvoiceModalOpen(true)}>
                  {t("visitDetails.createInvoice")}
                </Button>
              ) : undefined
            }
          >
            {invoiceView.status === "loading" && <LoadingState label={t("visitDetails.loadingInvoice")} />}

            {invoiceView.status === "error" && (
              <EmptyState title={t("visitDetails.unableToLoadInvoice")} description={invoiceView.message} />
            )}

            {invoiceView.status === "found" && <InvoiceSummaryCard invoice={invoiceView.invoice} />}

            {invoiceView.status === "none" && (
              <EmptyState
                title={t("visitDetails.noInvoiceTitle")}
                description={
                  canManageInvoices
                    ? t("visitDetails.noInvoiceDescription")
                    : t("visitDetails.noInvoiceFallback")
                }
              />
            )}
          </Card>
        </div>
      )}

      {visit && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceModalOpen}
          onClose={() => setIsCreateInvoiceModalOpen(false)}
          onCreated={(invoice) => {
            setIsCreateInvoiceModalOpen(false);
            setInvoiceView({ status: "found", invoice });
          }}
          prefill={{
            patientId: visit.patientId,
            patientName: visit.patientFullName,
            visitId: visit.id,
            serviceName: visit.serviceName,
          }}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        title={modalMode === "complete" ? t("visits.completeTitle") : t("visits.editTitle")}
        onClose={closeModal}
      >
        {form && (
          <form className="modal-form" onSubmit={handleSubmit}>
            <p className="visit-details-form-note">{t("visits.doctorNoteDisclaimer")}</p>

            <Textarea
              label={t("visits.chiefComplaint")}
              value={form.chiefComplaint}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
            />
            <Textarea
              label={t("visits.diagnosisNote")}
              value={form.diagnosisNote}
              onChange={(e) => setForm({ ...form, diagnosisNote: e.target.value })}
            />
            <Textarea
              label={t("visits.treatmentNote")}
              value={form.treatmentNote}
              onChange={(e) => setForm({ ...form, treatmentNote: e.target.value })}
            />
            <Input
              label={t("visits.toothNumbers")}
              value={form.toothNumbers}
              onChange={(e) => setForm({ ...form, toothNumbers: e.target.value })}
            />
            <Textarea
              label={t("visits.prescription")}
              value={form.prescriptionNote}
              onChange={(e) => setForm({ ...form, prescriptionNote: e.target.value })}
            />
            <Input
              label={t("visits.followUpDate")}
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
            />
            <Textarea
              label={t("visits.internalNotes")}
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            />

            {formError && <p className="visit-details-form-error">{formError}</p>}

            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("common.saving") : modalMode === "complete" ? t("visits.completeTitle") : t("common.save")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
