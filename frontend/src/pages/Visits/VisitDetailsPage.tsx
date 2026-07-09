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
import { formatDate } from "../../utils/patient";
import { VISIT_STATUS_LABELS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
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
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [id]);

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
        message: error instanceof ApiError ? error.message : "Unable to load invoice.",
      });
    }
  }, [id]);

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
      setFormError(error instanceof ApiError ? error.message : "Unable to save visit.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Visit Details"
        subtitle="View visit notes and prescription."
        actions={
          <Button variant="secondary" onClick={() => navigate("/visits")}>
            Back to Visits
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label="Loading visit..." />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title="Unable to load visit" description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && visit && (
        <div className="visit-details-stack">
          <Card
            actions={
              canManageVisits ? (
                <div className="visit-details-actions">
                  <Button variant="secondary" onClick={() => openModal("edit")}>
                    Edit
                  </Button>
                  {visit.status === "InProgress" && (
                    <Button variant="primary" onClick={() => openModal("complete")}>
                      Complete Visit
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          >
            <div className="visit-details-header">
              <div>
                <h2 className="visit-details-title">
                  {visit.serviceName} with {visit.doctorFullName}
                </h2>
                <p className="visit-details-subtitle">
                  Visit date: {formatDate(visit.visitDate)} · Appointment: {formatDate(visit.appointmentDate)}{" "}
                  {visit.appointmentStartTime} - {visit.appointmentEndTime}
                </p>
              </div>
              <StatusBadge label={VISIT_STATUS_LABELS[visit.status]} variant={VISIT_STATUS_VARIANTS[visit.status]} />
            </div>

            <div className="visit-details-grid">
              <div className="visit-details-field">
                <span className="visit-details-label">Patient</span>
                <span className="visit-details-value">{visit.patientFullName}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Patient phone</span>
                <span className="visit-details-value">{visit.patientPhoneNumber}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Doctor</span>
                <span className="visit-details-value">{visit.doctorFullName}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Service</span>
                <span className="visit-details-value">{visit.serviceName}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Started</span>
                <span className="visit-details-value">
                  {visit.startedAtUtc ? formatDate(visit.startedAtUtc) : "—"}
                </span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Completed</span>
                <span className="visit-details-value">
                  {visit.completedAtUtc ? formatDate(visit.completedAtUtc) : "—"}
                </span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Created</span>
                <span className="visit-details-value">{formatDate(visit.createdAtUtc)}</span>
              </div>
              <div className="visit-details-field">
                <span className="visit-details-label">Last updated</span>
                <span className="visit-details-value">{formatDate(visit.updatedAtUtc)}</span>
              </div>
            </div>
          </Card>

          <Card title="Chief Complaint">
            <p className="visit-details-note-caption">Doctor-entered notes.</p>
            <p className="visit-details-notes">{visit.chiefComplaint ?? "No chief complaint recorded."}</p>
          </Card>

          <Card title="Dental Treatment">
            <p className="visit-details-note-caption">Doctor-entered notes.</p>
            <div className="visit-details-field">
              <span className="visit-details-label">Diagnosis note</span>
              <p className="visit-details-notes">{visit.diagnosisNote ?? "No diagnosis note recorded."}</p>
            </div>
            <div className="visit-details-field">
              <span className="visit-details-label">Treatment note</span>
              <p className="visit-details-notes">{visit.treatmentNote ?? "No treatment note recorded."}</p>
            </div>
            <div className="visit-details-field">
              <span className="visit-details-label">Tooth numbers</span>
              <p className="visit-details-notes">{visit.toothNumbers ?? "—"}</p>
            </div>
          </Card>

          <Card title="Prescription">
            <p className="visit-details-note-caption">Prescription text entered manually by doctor.</p>
            <p className="visit-details-notes">{visit.prescriptionNote ?? "No prescription recorded."}</p>
          </Card>

          <Card title="Follow-up / Internal Notes">
            <div className="visit-details-field">
              <span className="visit-details-label">Follow-up date</span>
              <span className="visit-details-value">
                {visit.followUpDate ? formatDate(visit.followUpDate) : "No follow-up scheduled."}
              </span>
            </div>
            <div className="visit-details-field">
              <span className="visit-details-label">Internal notes</span>
              <p className="visit-details-notes">{visit.internalNotes ?? "No internal notes recorded."}</p>
            </div>
          </Card>

          <Card
            title="Invoice"
            actions={
              invoiceView.status === "none" && canManageInvoices ? (
                <Button variant="secondary" onClick={() => setIsCreateInvoiceModalOpen(true)}>
                  Create Invoice
                </Button>
              ) : undefined
            }
          >
            {invoiceView.status === "loading" && <LoadingState label="Loading invoice..." />}

            {invoiceView.status === "error" && (
              <EmptyState title="Unable to load invoice" description={invoiceView.message} />
            )}

            {invoiceView.status === "found" && <InvoiceSummaryCard invoice={invoiceView.invoice} />}

            {invoiceView.status === "none" && (
              <EmptyState
                title="No invoice yet"
                description={
                  canManageInvoices
                    ? "Create an invoice for this visit."
                    : "An invoice has not been created for this visit."
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

      <Modal isOpen={isModalOpen} title={modalMode === "complete" ? "Complete Visit" : "Edit Visit"} onClose={closeModal}>
        {form && (
          <form className="modal-form" onSubmit={handleSubmit}>
            <p className="visit-details-form-note">
              Doctor-entered notes. The system does not generate diagnosis or treatment suggestions.
            </p>

            <Textarea
              label="Chief complaint"
              value={form.chiefComplaint}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
            />
            <Textarea
              label="Diagnosis note"
              value={form.diagnosisNote}
              onChange={(e) => setForm({ ...form, diagnosisNote: e.target.value })}
            />
            <Textarea
              label="Treatment note"
              value={form.treatmentNote}
              onChange={(e) => setForm({ ...form, treatmentNote: e.target.value })}
            />
            <Input
              label="Tooth numbers"
              value={form.toothNumbers}
              onChange={(e) => setForm({ ...form, toothNumbers: e.target.value })}
            />
            <Textarea
              label="Prescription (entered manually by doctor)"
              value={form.prescriptionNote}
              onChange={(e) => setForm({ ...form, prescriptionNote: e.target.value })}
            />
            <Input
              label="Follow-up date"
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
            />
            <Textarea
              label="Internal notes"
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            />

            {formError && <p className="visit-details-form-error">{formError}</p>}

            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : modalMode === "complete" ? "Complete Visit" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
