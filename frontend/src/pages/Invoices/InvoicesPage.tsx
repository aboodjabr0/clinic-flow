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
import { formatDate } from "../../utils/patient";
import {
  ALL_PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
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
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [search, fromDate, toDate, statusFilter, patientIdFilter, pageNumber]);

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
        title="Invoices"
        subtitle="Track invoices and payments."
        actions={
          canManageInvoices ? (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create Invoice
            </Button>
          ) : undefined
        }
      />

      {stats && (
        <div className="invoices-stats">
          <StatCard label="Total Invoices" value={stats.totalInvoices} />
          <StatCard label="Unpaid" value={stats.unpaidInvoices} />
          <StatCard label="Partially Paid" value={stats.partiallyPaidInvoices} />
          <StatCard label="Paid" value={stats.paidInvoices} />
          <StatCard label="Total Revenue" value={formatMoney(stats.totalRevenue)} />
          <StatCard label="Outstanding Balance" value={formatMoney(stats.outstandingBalance)} />
        </div>
      )}

      <Card>
        {patientIdFilter && (
          <div className="invoices-patient-filter-banner">
            <span>
              Showing invoices for{" "}
              <strong>{patients.find((p) => p.id === patientIdFilter)?.fullName ?? "selected patient"}</strong>
            </span>
            <Button variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
        <div className="invoices-filters">
          <Input
            placeholder="Search by invoice number, patient, phone, service..."
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
            <option value="all">All statuses</option>
            {ALL_PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label="Loading invoices..." />}

        {view.status === "error" && <EmptyState title="Unable to load invoices" description={view.message} />}

        {view.status === "loaded" && invoices.length === 0 && (
          <EmptyState
            title="No invoices found"
            description={
              canManageInvoices
                ? "Try adjusting your search or filters, or create the first invoice."
                : "Try adjusting your search or filters."
            }
          />
        )}

        {view.status === "loaded" && invoices.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Service</th>
                    <th>Issue Date</th>
                    <th className="num">Total</th>
                    <th className="num">Paid</th>
                    <th className="num">Remaining</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
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
                          label={PAYMENT_STATUS_LABELS[invoice.status]}
                          variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
                        />
                      </td>
                      <td className="invoices-table-actions">
                        <Button variant="ghost" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                          View
                        </Button>
                        {canManageInvoices && invoice.remainingAmount > 0 && (
                          <Button variant="primary" onClick={() => setPaymentInvoice(invoice)}>
                            Add Payment
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="invoices-result-count">{totalCount} invoice(s) found</p>
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
