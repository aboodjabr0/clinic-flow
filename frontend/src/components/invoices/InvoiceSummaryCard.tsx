import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/StatusBadge";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import { PAYMENT_STATUS_LABEL_KEYS, PAYMENT_STATUS_VARIANTS, formatMoney } from "../../utils/invoice";
import type { Invoice } from "../../types/invoice";
import "./invoices.css";

interface InvoiceSummaryCardProps {
  invoice: Invoice;
}

/** Compact invoice summary used inside appointment/visit detail pages. */
export function InvoiceSummaryCard({ invoice }: InvoiceSummaryCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="invoice-summary">
      <div className="invoice-summary-header">
        <span className="invoice-summary-number">{invoice.invoiceNumber}</span>
        <StatusBadge
          label={t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}
          variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
        />
      </div>
      <div className="invoice-summary-grid">
        <span className="invoice-summary-label">{t("table.issued")}</span>
        <span className="invoice-summary-value">{formatDate(invoice.issueDate)}</span>
        <span className="invoice-summary-label">{t("table.total")}</span>
        <span className="invoice-summary-value">{formatMoney(invoice.totalAmount)}</span>
        <span className="invoice-summary-label">{t("table.paid")}</span>
        <span className="invoice-summary-value">{formatMoney(invoice.paidAmount)}</span>
        <span className="invoice-summary-label">{t("table.remaining")}</span>
        <span className="invoice-summary-value">{formatMoney(invoice.remainingAmount)}</span>
      </div>
      <Button variant="ghost" onClick={() => navigate(`/invoices/${invoice.id}`)}>
        {t("invoiceSummaryCard.viewInvoice")}
      </Button>
    </div>
  );
}
