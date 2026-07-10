import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Pagination } from "../../components/common/Pagination";
import { StatCard } from "../../components/dashboard/StatCard";
import { CreateInvoiceModal } from "../../components/invoices/CreateInvoiceModal";
import { AddPaymentModal } from "../../components/invoices/AddPaymentModal";
import { invoicesApi } from "../../api/invoicesApi";
import { patientsApi } from "../../api/patientsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import {
  ALL_PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL_KEYS,
  PAYMENT_STATUS_VARIANTS,
  formatMoney,
} from "../../utils/invoice";
import type { PatientListItem } from "../../types/patient";
import type { InvoiceListItem, InvoiceStats, PaymentStatus } from "../../types/invoice";
import "./InvoicesPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type StatusFilter = "all" | PaymentStatus;

const PAGE_SIZE = 10;

export function InvoicesPage() {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageInvoices = hasAnyRole(["Admin", "Receptionist"]);
  const patientIdFilter = searchParams.get("patientId");

  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [patients, setPatients] = useState<PatientListItem[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceListItem | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadInvoices = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await invoicesApi.getInvoices({
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        patientId: patientIdFilter ?? undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setInvoices(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("invoices.errorReachApi");
      setView({ status: "error", message });
    }
  }, [search, fromDate, toDate, statusFilter, patientIdFilter, pageNumber, t]);

  const loadStats = useCallback(async () => {
    try {
      const response = await invoicesApi.getInvoiceStats();
      setStats(response.data);
    } catch {
      setStats(null);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    if (!patientIdFilter) return;
    try {
      const response = await patientsApi.getPatients({ pageNumber: 1, pageSize: 100 });
      setPatients(response.data.items);
    } catch {
      // Only needed for the filter banner — the table can still load without it.
    }
  }, [patientIdFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setPageNumber(1);
    if (patientIdFilter) {
      setSearchParams((params) => {
        params.delete("patientId");
        return params;
      });
    }
  }

  async function refreshAfterChange() {
    await loadInvoices();
    await loadStats();
  }

  return (
    <>
      <PageHeader
        title={t("invoices.title")}
        subtitle={t("invoices.subtitle")}
        actions={
          canManageInvoices ? (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              {t("invoices.createInvoice")}
            </Button>
          ) : undefined
        }
      />

      {stats && (
        <div className="invoices-stats">
          <StatCard label={t("invoices.statTotalInvoices")} value={stats.totalInvoices} />
          <StatCard label={t("invoices.statUnpaid")} value={stats.unpaidInvoices} />
          <StatCard label={t("invoices.statPartiallyPaid")} value={stats.partiallyPaidInvoices} />
          <StatCard label={t("invoices.statPaid")} value={stats.paidInvoices} />
          <StatCard label={t("invoices.statTotalRevenue")} value={formatMoney(stats.totalRevenue)} />
          <StatCard label={t("invoices.statOutstandingBalance")} value={formatMoney(stats.outstandingBalance)} />
        </div>
      )}

      <Card>
        {patientIdFilter && (
          <div className="invoices-patient-filter-banner">
            <span>
              {t("invoices.showingFor")}{" "}
              <strong>{patients.find((p) => p.id === patientIdFilter)?.fullName ?? t("invoices.selectedPatient")}</strong>
            </span>
            <Button variant="ghost" onClick={clearFilters}>
              {t("common.clear")}
            </Button>
          </div>
        )}
        <div className="invoices-filters">
          <Input
            placeholder={t("invoices.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPageNumber(1);
            }}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPageNumber(1);
            }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPageNumber(1);
            }}
          >
            <option value="all">{t("invoices.allStatuses")}</option>
            {ALL_PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(PAYMENT_STATUS_LABEL_KEYS[status])}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label={t("invoices.loading")} />}

        {view.status === "error" && <EmptyState title={t("invoices.unableToLoad")} description={view.message} />}

        {view.status === "loaded" && invoices.length === 0 && (
          <EmptyState
            title={t("invoices.noneFoundTitle")}
            description={
              canManageInvoices
                ? t("invoices.noneFoundDescriptionCreate")
                : t("invoices.noneFoundDescriptionFilters")
            }
          />
        )}

        {view.status === "loaded" && invoices.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("table.invoiceNumber")}</th>
                    <th>{t("table.patient")}</th>
                    <th>{t("table.phone")}</th>
                    <th>{t("table.service")}</th>
                    <th>{t("table.issueDate")}</th>
                    <th className="num">{t("table.total")}</th>
                    <th className="num">{t("table.paid")}</th>
                    <th className="num">{t("table.remaining")}</th>
                    <th>{t("table.status")}</th>
                    <th aria-label={t("common.actions")} />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="invoices-table-number">{invoice.invoiceNumber}</td>
                      <td>{invoice.patientFullName}</td>
                      <td>{invoice.patientPhoneNumber}</td>
                      <td>{invoice.serviceName ?? "—"}</td>
                      <td>{formatDate(invoice.issueDate)}</td>
                      <td className="num">{formatMoney(invoice.totalAmount)}</td>
                      <td className="num">{formatMoney(invoice.paidAmount)}</td>
                      <td className="num invoices-remaining">{formatMoney(invoice.remainingAmount)}</td>
                      <td>
                        <StatusBadge
                          label={t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}
                          variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
                        />
                      </td>
                      <td className="invoices-table-actions">
                        <Button variant="ghost" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                          {t("common.view")}
                        </Button>
                        {canManageInvoices && invoice.remainingAmount > 0 && (
                          <Button variant="primary" onClick={() => setPaymentInvoice(invoice)}>
                            {t("invoices.addPayment")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="invoices-result-count">{t("invoices.countFound", { count: totalCount })}</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(invoice) => {
          setIsCreateModalOpen(false);
          navigate(`/invoices/${invoice.id}`);
        }}
      />

      {paymentInvoice && (
        <AddPaymentModal
          isOpen
          onClose={() => setPaymentInvoice(null)}
          onSaved={() => {
            setPaymentInvoice(null);
            refreshAfterChange();
          }}
          invoiceId={paymentInvoice.id}
          invoiceNumber={paymentInvoice.invoiceNumber}
          remainingAmount={paymentInvoice.remainingAmount}
        />
      )}
    </>
  );
}
