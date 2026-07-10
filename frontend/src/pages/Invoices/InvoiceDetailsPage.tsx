import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Textarea } from "../../components/common/Textarea";
import { Modal } from "../../components/common/Modal";
import { AddPaymentModal } from "../../components/invoices/AddPaymentModal";
import { invoicesApi } from "../../api/invoicesApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import {
  PAYMENT_METHOD_LABEL_KEYS,
  PAYMENT_STATUS_LABEL_KEYS,
  PAYMENT_STATUS_VARIANTS,
  formatMoney,
} from "../../utils/invoice";
import type { Invoice } from "../../types/invoice";
import "./InvoiceDetailsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

export function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const canManageInvoices = hasAnyRole(["Admin", "Receptionist"]);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDiscount, setEditDiscount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setView({ status: "loading" });
    try {
      const response = await invoicesApi.getInvoiceById(id);
      setInvoice(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("invoiceDetails.errorReachApi");
      setView({ status: "error", message });
    }
  }, [id, t]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  function openEditModal() {
    if (!invoice) return;
    setEditDiscount(formatMoney(invoice.discountAmount));
    setEditDueDate(invoice.dueDate ?? "");
    setEditNotes(invoice.notes ?? "");
    setEditError(null);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    if (isSaving) return;
    setIsEditModalOpen(false);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!invoice) return;

    const discountValue = editDiscount.trim() === "" ? undefined : Number(editDiscount);
    if (discountValue !== undefined && (Number.isNaN(discountValue) || discountValue < 0)) {
      setEditError(t("invoiceDetails.errorDiscountNegative"));
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const response = await invoicesApi.updateInvoice(invoice.id, {
        discountAmount: discountValue,
        dueDate: editDueDate || undefined,
        notes: editNotes.trim() || undefined,
      });
      setInvoice(response.data);
      setIsEditModalOpen(false);
    } catch (error) {
      setEditError(error instanceof ApiError ? error.message : t("invoiceDetails.errorUnableToUpdate"));
    } finally {
      setIsSaving(false);
    }
  }

  const hasPayments = (invoice?.payments.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title={t("invoiceDetails.title")}
        subtitle={t("invoiceDetails.subtitle")}
        actions={
          <Button variant="secondary" onClick={() => navigate("/invoices")}>
            {t("invoiceDetails.backToInvoices")}
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label={t("invoiceDetails.loading")} />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title={t("invoiceDetails.unableToLoad")} description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && invoice && (
        <div className="invoice-details-stack">
          <Card
            actions={
              canManageInvoices ? (
                <div className="invoice-details-actions">
                  <Button variant="secondary" onClick={openEditModal}>
                    {t("common.edit")}
                  </Button>
                  {invoice.remainingAmount > 0 && (
                    <Button variant="primary" onClick={() => setIsPaymentModalOpen(true)}>
                      {t("invoiceDetails.addPayment")}
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          >
            <div className="invoice-details-header">
              <div>
                <h2 className="invoice-details-title">{invoice.invoiceNumber}</h2>
                <p className="invoice-details-subtitle">
                  {t("invoiceDetails.issued", { date: formatDate(invoice.issueDate) })}
                  {invoice.dueDate ? ` · ${t("invoiceDetails.due", { date: formatDate(invoice.dueDate) })}` : ""}
                </p>
              </div>
              <StatusBadge
                label={t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}
                variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
              />
            </div>

            <div className="invoice-details-grid">
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.patient")}</span>
                <Link className="invoice-details-link" to={`/patients/${invoice.patientId}`}>
                  {invoice.patientFullName}
                </Link>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.patientPhone")}</span>
                <span className="invoice-details-value">{invoice.patientPhoneNumber}</span>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.service")}</span>
                <span className="invoice-details-value">{invoice.serviceName ?? "—"}</span>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.appointment")}</span>
                {invoice.appointmentId ? (
                  <Link className="invoice-details-link" to={`/appointments/${invoice.appointmentId}`}>
                    {t("invoiceDetails.viewAppointment")}
                  </Link>
                ) : (
                  <span className="invoice-details-value">—</span>
                )}
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.visit")}</span>
                {invoice.visitId ? (
                  <Link className="invoice-details-link" to={`/visits/${invoice.visitId}`}>
                    {t("invoiceDetails.viewVisit")}
                  </Link>
                ) : (
                  <span className="invoice-details-value">—</span>
                )}
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.created")}</span>
                <span className="invoice-details-value">{formatDate(invoice.createdAtUtc)}</span>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">{t("invoiceDetails.lastUpdated")}</span>
                <span className="invoice-details-value">{formatDate(invoice.updatedAtUtc)}</span>
              </div>
            </div>
          </Card>

          <Card title={t("invoiceDetails.amounts")}>
            <div className="invoice-details-amounts">
              <div className="invoice-details-amount-row">
                <span>{t("invoiceDetails.subtotal")}</span>
                <span>{formatMoney(invoice.subtotalAmount)}</span>
              </div>
              <div className="invoice-details-amount-row">
                <span>{t("invoiceDetails.discount")}</span>
                <span>-{formatMoney(invoice.discountAmount)}</span>
              </div>
              <div className="invoice-details-amount-row invoice-details-amount-total">
                <span>{t("invoiceDetails.total")}</span>
                <span>{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div className="invoice-details-amount-row">
                <span>{t("invoiceDetails.paid")}</span>
                <span>{formatMoney(invoice.paidAmount)}</span>
              </div>
              <div className="invoice-details-amount-row invoice-details-amount-total">
                <span>{t("invoiceDetails.remaining")}</span>
                <span>{formatMoney(invoice.remainingAmount)}</span>
              </div>
            </div>
          </Card>

          <Card title={t("invoiceDetails.notes")}>
            <p className="invoice-details-notes">{invoice.notes ?? t("invoiceDetails.noNotes")}</p>
          </Card>

          <Card title={t("invoiceDetails.payments")}>
            {!hasPayments && (
              <EmptyState
                title={t("invoiceDetails.noPaymentsTitle")}
                description={
                  canManageInvoices
                    ? t("invoiceDetails.noPaymentsDescriptionAdd")
                    : t("invoiceDetails.noPaymentsFallback")
                }
              />
            )}

            {hasPayments && (
              <div className="data-table-wrapper">
                <table className="data-table invoice-details-payments-table">
                  <thead>
                    <tr>
                      <th>{t("table.date")}</th>
                      <th>{t("table.total")}</th>
                      <th>{t("table.method")}</th>
                      <th>{t("table.reference")}</th>
                      <th>{t("table.recordedBy")}</th>
                      <th>{t("table.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>{t(PAYMENT_METHOD_LABEL_KEYS[payment.method])}</td>
                        <td>{payment.referenceNumber ?? "—"}</td>
                        <td>{payment.createdByUserName ?? "—"}</td>
                        <td>{payment.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {invoice && (
        <AddPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSaved={(updated) => {
            setIsPaymentModalOpen(false);
            setInvoice(updated);
          }}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          remainingAmount={invoice.remainingAmount}
        />
      )}

      <Modal isOpen={isEditModalOpen} title={t("invoiceDetails.editTitle")} onClose={closeEditModal}>
        <form className="modal-form" onSubmit={handleEditSubmit}>
          {hasPayments && <p className="invoice-details-form-note">{t("invoiceDetails.editDisclaimer")}</p>}
          <Input
            label={t("invoiceDetails.discountAmount")}
            type="number"
            min="0"
            step="0.01"
            value={editDiscount}
            onChange={(e) => setEditDiscount(e.target.value)}
            disabled={hasPayments}
          />
          <Input
            label={t("invoiceDetails.dueDateOptional")}
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
          />
          <Textarea
            label={t("invoiceDetails.notesOptional")}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />

          {editError && <p className="invoice-details-form-error">{editError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeEditModal} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
