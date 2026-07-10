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
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslationKey } from "../../i18n/translations";
import { formatDate, GENDER_LABEL_KEYS } from "../../utils/patient";
import {
  ALL_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABEL_KEYS,
  APPOINTMENT_STATUS_VARIANTS,
} from "../../utils/appointment";
import { formatMoney, PAYMENT_STATUS_LABEL_KEYS, PAYMENT_STATUS_VARIANTS } from "../../utils/invoice";
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
  const { t } = useTranslation();
  const canViewFinancials = hasAnyRole(["Admin", "Receptionist"]);
  const isDoctor = user?.role === "Doctor";

  const tabs: { key: ReportTab; labelKey: TranslationKey }[] = canViewFinancials
    ? [
        { key: "appointments", labelKey: "reports.tabAppointments" },
        { key: "patients", labelKey: "reports.tabPatients" },
        { key: "revenue", labelKey: "reports.tabRevenue" },
      ]
    : [{ key: "appointments", labelKey: "reports.tabAppointments" }];

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
      const message = error instanceof ApiError ? error.message : t("reports.errorReachApi");
      setAppointmentReport({ status: "error", message });
    }
  }, [fromDate, toDate, doctorFilter, statusFilter, t]);

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
      const message = error instanceof ApiError ? error.message : t("reports.errorReachApi");
      setPatientReport({ status: "error", message });
    }
  }, [fromDate, toDate, activeFilter, t]);

  const loadRevenueReport = useCallback(async () => {
    setRevenueReport({ status: "loading" });
    try {
      const response = await reportsApi.getRevenueReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setRevenueReport({ status: "loaded", data: response.data });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("reports.errorReachApi");
      setRevenueReport({ status: "error", message });
    }
  }, [fromDate, toDate, t]);

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
        {t("reports.showingRange", { fromDate: formatDate(range.fromDate), toDate: formatDate(range.toDate) })}
      </p>
    );
  }

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        subtitle={isDoctor ? t("reports.subtitleAppointments") : t("reports.subtitleGeneric")}
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            {t("reports.print")}
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
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        )}

        <div className="reports-filters">
          <Input label={t("reports.from")} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label={t("reports.to")} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          {activeTab === "appointments" && !isDoctor && (
            <Select label={t("reports.doctor")} value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
              <option value="all">{t("reports.allDoctors")}</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </Select>
          )}
          {activeTab === "appointments" && (
            <Select
              label={t("reports.status")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | AppointmentStatus)}
            >
              <option value="all">{t("reports.allStatuses")}</option>
              {ALL_APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(APPOINTMENT_STATUS_LABEL_KEYS[status])}
                </option>
              ))}
            </Select>
          )}
          {activeTab === "patients" && (
            <Select
              label={t("reports.patientStatus")}
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">{t("reports.allPatients")}</option>
              <option value="active">{t("reports.activeOnly")}</option>
              <option value="inactive">{t("reports.inactiveOnly")}</option>
            </Select>
          )}
          <div className="reports-filters-actions">
            <Button type="button" variant="ghost" onClick={clearFilters}>
              {t("reports.clear")}
            </Button>
          </div>
        </div>

        {activeTab === "appointments" && (
          <>
            {appointmentReport.status === "loading" && <LoadingState label={t("reports.loadingAppointmentReport")} />}
            {appointmentReport.status === "error" && (
              <EmptyState title={t("reports.unableToLoad")} description={appointmentReport.message} />
            )}
            {appointmentReport.status === "loaded" && (
              <>
                {renderRange(appointmentReport.data)}
                <div className="reports-summary">
                  <StatCard label={t("reports.statAppointments")} value={appointmentReport.data.totalCount} />
                  <StatCard label={t("reports.statCompleted")} value={appointmentReport.data.completedCount} />
                  <StatCard label={t("reports.statCancelledNoShow")} value={appointmentReport.data.cancelledOrNoShowCount} />
                </div>
                {appointmentReport.data.rows.length === 0 ? (
                  <EmptyState title={t("reports.noAppointmentsInRange")} />
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t("table.date")}</th>
                          <th>{t("table.time")}</th>
                          <th>{t("table.patient")}</th>
                          <th>{t("table.doctor")}</th>
                          <th>{t("table.service")}</th>
                          <th>{t("table.status")}</th>
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
                                label={t(APPOINTMENT_STATUS_LABEL_KEYS[row.status])}
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
            {patientReport.status === "loading" && <LoadingState label={t("reports.loadingPatientReport")} />}
            {patientReport.status === "error" && (
              <EmptyState title={t("reports.unableToLoad")} description={patientReport.message} />
            )}
            {patientReport.status === "loaded" && (
              <>
                {renderRange(patientReport.data)}
                <div className="reports-summary">
                  <StatCard label={t("reports.statPatientsRegistered")} value={patientReport.data.totalCount} />
                  <StatCard label={t("reports.statActive")} value={patientReport.data.activeCount} />
                </div>
                {patientReport.data.rows.length === 0 ? (
                  <EmptyState title={t("reports.noPatientsInRange")} />
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t("table.registered")}</th>
                          <th>{t("table.patient")}</th>
                          <th>{t("table.phone")}</th>
                          <th>{t("table.gender")}</th>
                          <th>{t("table.status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientReport.data.rows.map((row) => (
                          <tr key={row.id}>
                            <td>{formatDate(row.registeredDate)}</td>
                            <td>{row.fullName}</td>
                            <td>{row.phoneNumber}</td>
                            <td>{t(GENDER_LABEL_KEYS[row.gender])}</td>
                            <td>
                              <StatusBadge
                                label={row.isActive ? t("common.active") : t("common.inactive")}
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
            {revenueReport.status === "loading" && <LoadingState label={t("reports.loadingRevenueReport")} />}
            {revenueReport.status === "error" && (
              <EmptyState title={t("reports.unableToLoad")} description={revenueReport.message} />
            )}
            {revenueReport.status === "loaded" && (
              <>
                {renderRange(revenueReport.data)}
                <div className="reports-summary">
                  <StatCard label={t("reports.statInvoices")} value={revenueReport.data.invoiceCount} />
                  <StatCard label={t("reports.statInvoiced")} value={formatMoney(revenueReport.data.totalInvoiced)} />
                  <StatCard label={t("reports.statCollected")} value={formatMoney(revenueReport.data.totalPaid)} />
                  <StatCard label={t("reports.statOutstanding")} value={formatMoney(revenueReport.data.totalOutstanding)} />
                </div>
                {revenueReport.data.rows.length === 0 ? (
                  <EmptyState title={t("reports.noInvoicesInRange")} />
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t("table.invoice")}</th>
                          <th>{t("table.issued")}</th>
                          <th>{t("table.patient")}</th>
                          <th>{t("table.service")}</th>
                          <th>{t("table.total")}</th>
                          <th>{t("table.paid")}</th>
                          <th>{t("table.remaining")}</th>
                          <th>{t("table.status")}</th>
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
                                label={t(PAYMENT_STATUS_LABEL_KEYS[row.status])}
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
