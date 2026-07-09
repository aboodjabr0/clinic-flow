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
import { formatDate } from "../../utils/patient";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
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
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [id]);

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
      setEditError("Discount cannot be negative.");
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
      setEditError(error instanceof ApiError ? error.message : "Unable to update invoice.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasPayments = (invoice?.payments.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="Invoice Details"
        subtitle="View invoice, payment history, and balance."
        actions={
          <Button variant="secondary" onClick={() => navigate("/invoices")}>
            Back to Invoices
          </Button>
        }
      />

      {view.status === "loading" && (
        <Card>
          <LoadingState label="Loading invoice..." />
        </Card>
      )}

      {view.status === "error" && (
        <Card>
          <EmptyState title="Unable to load invoice" description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && invoice && (
        <div className="invoice-details-stack">
          <Card
            actions={
              canManageInvoices ? (
                <div className="invoice-details-actions">
                  <Button variant="secondary" onClick={openEditModal}>
                    Edit
                  </Button>
                  {invoice.remainingAmount > 0 && (
                    <Button variant="primary" onClick={() => setIsPaymentModalOpen(true)}>
                      Add Payment
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
                  Issued {formatDate(invoice.issueDate)}
                  {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
                </p>
              </div>
              <StatusBadge
                label={PAYMENT_STATUS_LABELS[invoice.status]}
                variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
              />
            </div>

            <div className="invoice-details-grid">
              <div className="invoice-details-field">
                <span className="invoice-details-label">Patient</span>
                <Link className="invoice-details-link" to={`/patients/${invoice.patientId}`}>
                  {invoice.patientFullName}
                </Link>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">Patient phone</span>
                <span className="invoice-details-value">{invoice.patientPhoneNumber}</span>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">Service</span>
                <span className="invoice-details-value">{invoice.serviceName ?? "—"}</span>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">Appointment</span>
                {invoice.appointmentId ? (
                  <Link className="invoice-details-link" to={`/appointments/${invoice.appointmentId}`}>
                    View appointment
                  </Link>
                ) : (
                  <span className="invoice-details-value">—</span>
                )}
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">Visit</span>
                {invoice.visitId ? (
                  <Link className="invoice-details-link" to={`/visits/${invoice.visitId}`}>
                    View visit
                  </Link>
                ) : (
                  <span className="invoice-details-value">—</span>
                )}
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">Created</span>
                <span className="invoice-details-value">{formatDate(invoice.createdAtUtc)}</span>
              </div>
              <div className="invoice-details-field">
                <span className="invoice-details-label">Last updated</span>
                <span className="invoice-details-value">{formatDate(invoice.updatedAtUtc)}</span>
              </div>
            </div>
          </Card>

          <Card title="Amounts">
            <div className="invoice-details-amounts">
              <div className="invoice-details-amount-row">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotalAmount)}</span>
              </div>
              <div className="invoice-details-amount-row">
                <span>Discount</span>
                <span>-{formatMoney(invoice.discountAmount)}</span>
              </div>
              <div className="invoice-details-amount-row invoice-details-amount-total">
                <span>Total</span>
                <span>{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div className="invoice-details-amount-row">
                <span>Paid</span>
                <span>{formatMoney(invoice.paidAmount)}</span>
              </div>
              <div className="invoice-details-amount-row invoice-details-amount-total">
                <span>Remaining</span>
                <span>{formatMoney(invoice.remainingAmount)}</span>
              </div>
            </div>
          </Card>

          <Card title="Notes">
            <p className="invoice-details-notes">{invoice.notes ?? "No notes recorded."}</p>
          </Card>

          <Card title="Payments">
            {!hasPayments && (
              <EmptyState
                title="No payments recorded"
                description={
                  canManageInvoices
                    ? "Record the first payment with the Add Payment button."
                    : "No payments have been recorded for this invoice."
                }
              />
            )}

            {hasPayments && (
              <div className="data-table-wrapper">
                <table className="data-table invoice-details-payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Recorded by</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>{PAYMENT_METHOD_LABELS[payment.method]}</td>
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

      <Modal isOpen={isEditModalOpen} title="Edit Invoice" onClose={closeEditModal}>
        <form className="modal-form" onSubmit={handleEditSubmit}>
          {hasPayments && (
            <p className="invoice-details-form-note">
              Payments have been recorded, so the discount can no longer be changed. Only notes and due date are
              editable.
            </p>
          )}
          <Input
            label="Discount amount"
            type="number"
            min="0"
            step="0.01"
            value={editDiscount}
            onChange={(e) => setEditDiscount(e.target.value)}
            disabled={hasPayments}
          />
          <Input
            label="Due date (optional)"
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
          />
          <Textarea label="Notes (optional)" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />

          {editError && <p className="invoice-details-form-error">{editError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeEditModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
