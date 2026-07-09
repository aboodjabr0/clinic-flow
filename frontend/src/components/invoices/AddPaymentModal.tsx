import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Textarea } from "../common/Textarea";
import { Modal } from "../common/Modal";
import { invoicesApi } from "../../api/invoicesApi";
import { ApiError } from "../../api/apiClient";
import { ALL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatMoney } from "../../utils/invoice";
import type { Invoice, PaymentMethod } from "../../types/invoice";
import "./invoices.css";

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (invoice: Invoice) => void;
  invoiceId: string;
  invoiceNumber: string;
  remainingAmount: number;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddPaymentModal({
  isOpen,
  onClose,
  onSaved,
  invoiceId,
  invoiceNumber,
  remainingAmount,
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(formatMoney(remainingAmount));
    setPaymentDate(todayIsoDate());
    setMethod("Cash");
    setReferenceNumber("");
    setNotes("");
    setFormError(null);
  }, [isOpen, remainingAmount]);

  function closeModal() {
    if (isSaving) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const amountValue = Number(amount);
    if (amount.trim() === "" || Number.isNaN(amountValue) || amountValue <= 0) {
      setFormError("Payment amount must be greater than zero.");
      return;
    }
    if (amountValue > remainingAmount) {
      setFormError(`Payment amount cannot exceed the remaining balance (${formatMoney(remainingAmount)}).`);
      return;
    }
    if (!paymentDate) {
      setFormError("Payment date is required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const response = await invoicesApi.addPayment(invoiceId, {
        amount: amountValue,
        paymentDate,
        method,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved(response.data);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to record payment.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title={`Add Payment — ${invoiceNumber}`} onClose={closeModal}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <p className="invoice-form-note">Remaining balance: {formatMoney(remainingAmount)}</p>

        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Payment date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
        <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {ALL_PAYMENT_METHODS.map((paymentMethod) => (
            <option key={paymentMethod} value={paymentMethod}>
              {PAYMENT_METHOD_LABELS[paymentMethod]}
            </option>
          ))}
        </Select>
        <Input
          label="Reference number (optional)"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {formError && <p className="invoice-form-error">{formError}</p>}

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Record Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
