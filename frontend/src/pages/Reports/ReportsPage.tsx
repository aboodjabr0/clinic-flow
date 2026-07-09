import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { StatCard } from "../../components/dashboard/StatCard";
import { reportsApi } from "../../api/reportsApi";
import { doctorsApi } from "../../api/doctorsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { formatDate, GENDER_LABELS } from "../../utils/patient";
import {
  ALL_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
} from "../../utils/appointment";
import { formatMoney, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS } from "../../utils/invoice";
import type { AppointmentStatus } from "../../types/appointment";
import type { Doctor } from "../../types/doctor";
import type { AppointmentReport, PatientReport, RevenueReport } from "../../types/reports";
import "./ReportsPage.css";

type ReportTab = "appointments" | "patients" | "revenue";

type ReportState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; data: T };

export function ReportsPage() {
  const { user, hasAnyRole } = useAuth();
  const canViewFinancials = hasAnyRole(["Admin", "Receptionist"]);
  const isDoctor = user?.role === "Doctor";

  const tabs: { key: ReportTab; label: string }[] = canViewFinancials
    ? [
        { key: "appointments", label: "Appointments" },
        { key: "patients", label: "Patients" },
        { key: "revenue", label: "Revenue" },
      ]
    : [{ key: "appointments", label: "Appointments" }];

  const [activeTab, setActiveTab] = useState<ReportTab>("appointments");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointmentReport, setAppointmentReport] = useState<ReportState<AppointmentReport>>({ status: "loading" });
  const [patientReport, setPatientReport] = useState<ReportState<PatientReport>>({ status: "loading" });
  const [revenueReport, setRevenueReport] = useState<ReportState<RevenueReport>>({ status: "loading" });

  useEffect(() => {
    if (isDoctor) return;
    doctorsApi
      .getAll()
      .then((response) => setDoctors(response.data))
      .catch(() => {
        // The doctor filter is optional — the report still works without it.
      });
  }, [isDoctor]);

  const loadAppointmentReport = useCallback(async () => {
    setAppointmentReport({ status: "loading" });
    try {
      const response = await reportsApi.getAppointmentReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        doctorId: doctorFilter === "all" ? undefined : doctorFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setAppointmentReport({ status: "loaded", data: response.data });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setAppointmentReport({ status: "error", message });
    }
  }, [fromDate, toDate, doctorFilter, statusFilter]);

  const loadPatientReport = useCallback(async () => {
    setPatientReport({ status: "loading" });
    try {
      const response = await reportsApi.getPatientReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      });
      setPatientReport({ status: "loaded", data: response.data });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setPatientReport({ status: "error", message });
    }
  }, [fromDate, toDate, activeFilter]);

  const loadRevenueReport = useCallback(async () => {
    setRevenueReport({ status: "loading" });
    try {
      const response = await reportsApi.getRevenueReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setRevenueReport({ status: "loaded", data: response.data });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setRevenueReport({ status: "error", message });
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (activeTab === "appointments") loadAppointmentReport();
  }, [activeTab, loadAppointmentReport]);

  useEffect(() => {
    if (activeTab === "patients" && canViewFinancials) loadPatientReport();
  }, [activeTab, canViewFinancials, loadPatientReport]);

  useEffect(() => {
    if (activeTab === "revenue" && canViewFinancials) loadRevenueReport();
  }, [activeTab, canViewFinancials, loadRevenueReport]);

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setDoctorFilter("all");
    setStatusFilter("all");
    setActiveFilter("all");
  }

  function renderRange(range: { fromDate: string; toDate: string }) {
    return (
      <p className="reports-range">
        Showing {formatDate(range.fromDate)} to {formatDate(range.toDate)}
      </p>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={isDoctor ? "Your appointment report." : "Operational and financial summaries."}
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        }
      />

      <Card>
        {tabs.length > 1 && (
          <div className="reports-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`reports-tab ${activeTab === tab.key ? "reports-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="reports-filters">
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          {activeTab === "appointments" && !isDoctor && (
            <Select label="Doctor" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
              <option value="all">All doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </Select>
          )}
          {activeTab === "appointments" && (
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | AppointmentStatus)}
            >
              <option value="all">All statuses</option>
              {ALL_APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {APPOINTMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
          {activeTab === "patients" && (
            <Select
              label="Active"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">All patients</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </Select>
          )}
          <div className="reports-filters-actions">
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>

        {activeTab === "appointments" && (
          <>
            {appointmentReport.status === "loading" && <LoadingState label="Loading appointment report..." />}
            {appointmentReport.status === "error" && (
              <EmptyState title="Unable to load report" description={appointmentReport.message} />
            )}
            {appointmentReport.status === "loaded" && (
              <>
                {renderRange(appointmentReport.data)}
                <div className="reports-summary">
                  <StatCard label="Appointments" value={appointmentReport.data.totalCount} />
                  <StatCard label="Completed" value={appointmentReport.data.completedCount} />
                  <StatCard label="Cancelled / No Show" value={appointmentReport.data.cancelledOrNoShowCount} />
                </div>
                {appointmentReport.data.rows.length === 0 ? (
                  <EmptyState title="No appointments in this range" />
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Patient</th>
                          <th>Doctor</th>
                          <th>Service</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointmentReport.data.rows.map((row) => (
                          <tr key={row.id}>
                            <td>{formatDate(row.appointmentDate)}</td>
                            <td>
                              {row.startTime} - {row.endTime}
                            </td>
                            <td>{row.patientFullName}</td>
                            <td>{row.doctorFullName}</td>
                            <td>{row.serviceName}</td>
                            <td>
                              <StatusBadge
                                label={APPOINTMENT_STATUS_LABELS[row.status]}
                                variant={APPOINTMENT_STATUS_VARIANTS[row.status]}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "patients" && canViewFinancials && (
          <>
            {patientReport.status === "loading" && <LoadingState label="Loading patient report..." />}
            {patientReport.status === "error" && (
              <EmptyState title="Unable to load report" description={patientReport.message} />
            )}
            {patientReport.status === "loaded" && (
              <>
                {renderRange(patientReport.data)}
                <div className="reports-summary">
                  <StatCard label="Patients Registered" value={patientReport.data.totalCount} />
                  <StatCard label="Active" value={patientReport.data.activeCount} />
                </div>
                {patientReport.data.rows.length === 0 ? (
                  <EmptyState title="No patients registered in this range" />
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Registered</th>
                          <th>Patient</th>
                          <th>Phone</th>
                          <th>Gender</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientReport.data.rows.map((row) => (
                          <tr key={row.id}>
                            <td>{formatDate(row.registeredDate)}</td>
                            <td>{row.fullName}</td>
                            <td>{row.phoneNumber}</td>
                            <td>{GENDER_LABELS[row.gender]}</td>
                            <td>
                              <StatusBadge
                                label={row.isActive ? "Active" : "Inactive"}
                                variant={row.isActive ? "success" : "neutral"}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "revenue" && canViewFinancials && (
          <>
            {revenueReport.status === "loading" && <LoadingState label="Loading revenue report..." />}
            {revenueReport.status === "error" && (
              <EmptyState title="Unable to load report" description={revenueReport.message} />
            )}
            {revenueReport.status === "loaded" && (
              <>
                {renderRange(revenueReport.data)}
                <div className="reports-summary">
                  <StatCard label="Invoices" value={revenueReport.data.invoiceCount} />
                  <StatCard label="Invoiced" value={formatMoney(revenueReport.data.totalInvoiced)} />
                  <StatCard label="Collected" value={formatMoney(revenueReport.data.totalPaid)} />
                  <StatCard label="Outstanding" value={formatMoney(revenueReport.data.totalOutstanding)} />
                </div>
                {revenueReport.data.rows.length === 0 ? (
                  <EmptyState title="No invoices in this range" />
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Issued</th>
                          <th>Patient</th>
                          <th>Service</th>
                          <th>Total</th>
                          <th>Paid</th>
                          <th>Remaining</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueReport.data.rows.map((row) => (
                          <tr key={row.invoiceId}>
                            <td>{row.invoiceNumber}</td>
                            <td>{formatDate(row.issueDate)}</td>
                            <td>{row.patientFullName}</td>
                            <td>{row.serviceName ?? "—"}</td>
                            <td>{formatMoney(row.totalAmount)}</td>
                            <td>{formatMoney(row.paidAmount)}</td>
                            <td>{formatMoney(row.remainingAmount)}</td>
                            <td>
                              <StatusBadge
                                label={PAYMENT_STATUS_LABELS[row.status]}
                                variant={PAYMENT_STATUS_VARIANTS[row.status]}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}
