import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Textarea } from "../common/Textarea";
import { Modal } from "../common/Modal";
import { invoicesApi } from "../../api/invoicesApi";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import { ALL_PAYMENT_METHODS, PAYMENT_METHOD_LABEL_KEYS, formatMoney } from "../../utils/invoice";
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
  const { t } = useTranslation();
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
      setFormError(t("addPaymentModal.errorAmountPositive"));
      return;
    }
    if (amountValue > remainingAmount) {
      setFormError(t("addPaymentModal.errorAmountExceeds", { amount: formatMoney(remainingAmount) }));
      return;
    }
    if (!paymentDate) {
      setFormError(t("addPaymentModal.errorDateRequired"));
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
      setFormError(error instanceof ApiError ? error.message : t("addPaymentModal.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title={t("addPaymentModal.titleWithInvoice", { invoiceNumber })} onClose={closeModal}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <p className="invoice-form-note">{t("addPaymentModal.remainingBalance", { amount: formatMoney(remainingAmount) })}</p>

        <Input
          label={t("addPaymentModal.amount")}
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label={t("addPaymentModal.paymentDate")}
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
        <Select label={t("addPaymentModal.method")} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {ALL_PAYMENT_METHODS.map((paymentMethod) => (
            <option key={paymentMethod} value={paymentMethod}>
              {t(PAYMENT_METHOD_LABEL_KEYS[paymentMethod])}
            </option>
          ))}
        </Select>
        <Input
          label={t("addPaymentModal.referenceOptional")}
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />
        <Textarea
          label={t("addPaymentModal.notesOptional")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {formError && <p className="invoice-form-error">{formError}</p>}

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("common.saving") : t("addPaymentModal.recordPayment")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
