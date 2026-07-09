import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/StatusBadge";
import { formatDate } from "../../utils/patient";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS, formatMoney } from "../../utils/invoice";
import type { Invoice } from "../../types/invoice";
import "./invoices.css";

interface InvoiceSummaryCardProps {
  invoice: Invoice;
}

/** Compact invoice summary used inside appointment/visit detail pages. */
export function InvoiceSummaryCard({ invoice }: InvoiceSummaryCardProps) {
  const navigate = useNavigate();

  return (
    <div className="invoice-summary">
      <div className="invoice-summary-header">
        <span className="invoice-summary-number">{invoice.invoiceNumber}</span>
        <StatusBadge
          label={PAYMENT_STATUS_LABELS[invoice.status]}
          variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
        />
      </div>
      <div className="invoice-summary-grid">
        <span className="invoice-summary-label">Issued</span>
        <span className="invoice-summary-value">{formatDate(invoice.issueDate)}</span>
        <span className="invoice-summary-label">Total</span>
        <span className="invoice-summary-value">{formatMoney(invoice.totalAmount)}</span>
        <span className="invoice-summary-label">Paid</span>
        <span className="invoice-summary-value">{formatMoney(invoice.paidAmount)}</span>
        <span className="invoice-summary-label">Remaining</span>
        <span className="invoice-summary-value">{formatMoney(invoice.remainingAmount)}</span>
      </div>
      <Button variant="ghost" onClick={() => navigate(`/invoices/${invoice.id}`)}>
        View Invoice
      </Button>
    </div>
  );
}
