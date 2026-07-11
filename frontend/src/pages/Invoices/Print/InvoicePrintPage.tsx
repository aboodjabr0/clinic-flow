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
import { PAYMENT_METHOD_LABEL_KEYS, PAYMENT_STATUS_LABEL_KEYS, formatMoney } from "../../../utils/invoice";
import type { Invoice } from "../../../types/invoice";
import type { ClinicSettings } from "../../../types/clinicSettings";
import { ClinicPrintHeader } from "./ClinicPrintHeader";
import { PrintFooter } from "./PrintFooter";
import "./PrintDocument.css";

type ViewState = { status: "loading" } | { status: "error"; message: string } | { status: "loaded" };

export function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clinic, setClinic] = useState<ClinicSettings | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setView({ status: "loading" });
      try {
        const [invoiceResponse, clinicResponse] = await Promise.all([
          invoicesApi.getInvoiceById(id!),
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
  }, [id, t]);

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

        <h1 className="print-doc-title">{t("invoicePrint.invoiceTitle")}</h1>

        <div className="print-section">
          <div className="print-grid">
            <div>
              <p className="print-field-label">{t("invoicePrint.invoiceNumber")}</p>
              <p className="print-field-value">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="print-field-label">{t("table.status")}</p>
              <p className="print-field-value">{t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}</p>
            </div>
            <div>
              <p className="print-field-label">{t("table.issueDate")}</p>
              <p className="print-field-value">{formatDate(invoice.issueDate)}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="print-field-label">{t("invoicePrint.dueDate")}</p>
                <p className="print-field-value">{formatDate(invoice.dueDate)}</p>
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

        {(invoice.serviceName || invoice.doctorFullName) && (
          <div className="print-section">
            <div className="print-grid">
              {invoice.serviceName && (
                <div>
                  <p className="print-field-label">{t("invoiceDetails.service")}</p>
                  <p className="print-field-value">{invoice.serviceName}</p>
                </div>
              )}
              {invoice.doctorFullName && (
                <div>
                  <p className="print-field-label">{t("table.doctor")}</p>
                  <p className="print-field-value">{invoice.doctorFullName}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="print-section">
          <h2 className="print-section-title">{t("invoiceDetails.amounts")}</h2>
          <div className="print-summary">
            <div className="print-summary-row">
              <span>{t("invoiceDetails.subtotal")}</span>
              <span>{formatMoney(invoice.subtotalAmount)}</span>
            </div>
            <div className="print-summary-row">
              <span>{t("invoiceDetails.discount")}</span>
              <span>-{formatMoney(invoice.discountAmount)}</span>
            </div>
            <div className="print-summary-row print-summary-highlight">
              <span>{t("invoicePrint.totalAmount")}</span>
              <span>{formatMoney(invoice.totalAmount)}</span>
            </div>
            <div className="print-summary-row">
              <span>{t("invoicePrint.paidAmount")}</span>
              <span>{formatMoney(invoice.paidAmount)}</span>
            </div>
            <div className="print-summary-row print-summary-highlight">
              <span>{t("invoicePrint.remainingBalance")}</span>
              <span>{formatMoney(invoice.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="print-section">
            <h2 className="print-section-title">{t("invoiceDetails.notes")}</h2>
            <p className="print-field-value">{invoice.notes}</p>
          </div>
        )}

        <div className="print-section">
          <h2 className="print-section-title">{t("invoiceDetails.payments")}</h2>
          {invoice.payments.length === 0 ? (
            <p className="print-field-label">{t("invoicePrint.noPaymentsFound")}</p>
          ) : (
            <table className="print-table">
              <thead>
                <tr>
                  <th>{t("table.date")}</th>
                  <th>{t("table.total")}</th>
                  <th>{t("table.method")}</th>
                  <th>{t("table.reference")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{t(PAYMENT_METHOD_LABEL_KEYS[payment.method])}</td>
                    <td>{payment.referenceNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <PrintFooter />
      </div>
    </div>
  );
}
