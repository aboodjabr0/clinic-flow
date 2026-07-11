import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/common/Button";
import { LoadingState } from "../../../components/common/LoadingState";
import { EmptyState } from "../../../components/common/EmptyState";
import { invoicesApi } from "../../../api/invoicesApi";
import { clinicSettingsApi } from "../../../api/clinicSettingsApi";
import { ApiError } from "../../../api/apiClient";
import { useTranslation } from "../../../i18n/useTranslation";
import { formatDate } from "../../../utils/patient";
import { PAYMENT_METHOD_LABEL_KEYS, formatMoney } from "../../../utils/invoice";
import type { Invoice, Payment } from "../../../types/invoice";
import type { ClinicSettings } from "../../../types/clinicSettings";
import { ClinicPrintHeader } from "./ClinicPrintHeader";
import { PrintFooter } from "./PrintFooter";
import "./PrintDocument.css";

type ViewState = { status: "loading" } | { status: "error"; message: string } | { status: "loaded" };

/**
 * Payments carry no point-in-time balance snapshot (they're immutable once
 * recorded), so the balance remaining right after this specific payment is
 * derived by replaying payments in chronological order rather than reading
 * the invoice's current (possibly later) remaining amount.
 */
function remainingBalanceAfterPayment(invoice: Invoice, paymentId: string): number | null {
  const chronological = [...invoice.payments].sort((a, b) => {
    const byDate = a.paymentDate.localeCompare(b.paymentDate);
    if (byDate !== 0) return byDate;
    return a.createdAtUtc.localeCompare(b.createdAtUtc);
  });

  let cumulativePaid = 0;
  for (const payment of chronological) {
    cumulativePaid += payment.amount;
    if (payment.id === paymentId) {
      return invoice.totalAmount - cumulativePaid;
    }
  }
  return null;
}

export function ReceiptPrintPage() {
  const { invoiceId, paymentId } = useParams<{ invoiceId: string; paymentId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clinic, setClinic] = useState<ClinicSettings | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;

    async function load() {
      setView({ status: "loading" });
      try {
        const [invoiceResponse, clinicResponse] = await Promise.all([
          invoicesApi.getInvoiceById(invoiceId!),
          clinicSettingsApi.get(),
        ]);
        if (cancelled) return;
        setInvoice(invoiceResponse.data);
        setClinic(clinicResponse.data);
        setView({ status: "loaded" });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : t("invoiceDetails.errorReachApi");
        setView({ status: "error", message });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, t]);

  if (view.status === "loading") {
    return (
      <div className="print-page">
        <LoadingState label={t("invoiceDetails.loading")} />
      </div>
    );
  }

  if (view.status === "error" || !invoice) {
    return (
      <div className="print-page">
        <EmptyState
          title={t("invoiceDetails.unableToLoad")}
          description={view.status === "error" ? view.message : undefined}
        />
      </div>
    );
  }

  const payment: Payment | undefined = invoice.payments.find((p) => p.id === paymentId);

  if (!payment) {
    return (
      <div className="print-page">
        <EmptyState title={t("invoicePrint.receiptNotFound")} />
      </div>
    );
  }

  const remainingAfter = remainingBalanceAfterPayment(invoice, payment.id);

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <Button variant="secondary" onClick={() => navigate(`/invoices/${invoice.id}`)}>
          {t("invoicePrint.backToInvoice")}
        </Button>
        <Button onClick={() => window.print()}>{t("invoicePrint.saveAsPdf")}</Button>
      </div>

      <div className="print-sheet">
        <ClinicPrintHeader clinic={clinic} />

        <h1 className="print-doc-title">{t("invoicePrint.receiptTitle")}</h1>

        <div className="print-highlight">
          <p className="print-highlight-label">{t("invoicePrint.amountPaid")}</p>
          <p className="print-highlight-amount">{formatMoney(payment.amount)}</p>
        </div>

        <div className="print-section">
          <h2 className="print-section-title">{t("invoicePrint.paymentInformation")}</h2>
          <div className="print-grid">
            <div>
              <p className="print-field-label">{t("invoicePrint.receiptNumber")}</p>
              <p className="print-field-value">{payment.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="print-field-label">{t("invoicePrint.paymentDate")}</p>
              <p className="print-field-value">{formatDate(payment.paymentDate)}</p>
            </div>
            <div>
              <p className="print-field-label">{t("invoicePrint.paymentMethod")}</p>
              <p className="print-field-value">{t(PAYMENT_METHOD_LABEL_KEYS[payment.method])}</p>
            </div>
            {payment.referenceNumber && (
              <div>
                <p className="print-field-label">{t("table.reference")}</p>
                <p className="print-field-value">{payment.referenceNumber}</p>
              </div>
            )}
          </div>
        </div>

        <div className="print-section">
          <h2 className="print-section-title">{t("invoicePrint.patientInformation")}</h2>
          <div className="print-grid">
            <div>
              <p className="print-field-label">{t("invoiceDetails.patient")}</p>
              <p className="print-field-value">{invoice.patientFullName}</p>
            </div>
            <div>
              <p className="print-field-label">{t("invoiceDetails.patientPhone")}</p>
              <p className="print-field-value">{invoice.patientPhoneNumber}</p>
            </div>
          </div>
        </div>

        <div className="print-section">
          <h2 className="print-section-title">{t("invoicePrint.relatedInvoice")}</h2>
          <div className="print-summary">
            <div className="print-summary-row">
              <span>{t("invoicePrint.invoiceNumber")}</span>
              <span>{invoice.invoiceNumber}</span>
            </div>
            <div className="print-summary-row">
              <span>{t("invoicePrint.totalAmount")}</span>
              <span>{formatMoney(invoice.totalAmount)}</span>
            </div>
            {remainingAfter !== null && (
              <div className="print-summary-row print-summary-highlight">
                <span>{t("invoicePrint.remainingBalance")}</span>
                <span>{formatMoney(Math.max(remainingAfter, 0))}</span>
              </div>
            )}
          </div>
        </div>

        <div className="print-signature-row">
          <div className="print-signature-line">
            {t("invoicePrint.receivedBy")}: {payment.createdByUserName ?? "—"}
          </div>
          <div className="print-signature-line">{t("invoicePrint.signature")}</div>
        </div>

        <PrintFooter />
      </div>
    </div>
  );
}
