import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/dashboard/StatCard";
import { dashboardApi } from "../../api/dashboardApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslationKey } from "../../i18n/translations";
import { formatDate } from "../../utils/patient";
import { formatMoney, PAYMENT_STATUS_LABEL_KEYS, PAYMENT_STATUS_VARIANTS } from "../../utils/invoice";
import { APPOINTMENT_STATUS_LABEL_KEYS, APPOINTMENT_STATUS_VARIANTS } from "../../utils/appointment";
import { VISIT_STATUS_LABEL_KEYS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
import type {
  AppointmentStatusBreakdown,
  DashboardRevenue,
  DashboardSummary,
  RecentActivity,
  RecentAppointment,
  TodayClinic,
  UpcomingFollowUp,
} from "../../types/dashboard";
import "./DashboardPage.css";

type SectionState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; data: T };

const BREAKDOWN_ITEMS: { key: keyof AppointmentStatusBreakdown; labelKey: TranslationKey }[] = [
  { key: "scheduled", labelKey: "status.appointment.scheduled" },
  { key: "arrived", labelKey: "status.appointment.arrived" },
  { key: "inProgress", labelKey: "status.appointment.inProgress" },
  { key: "completed", labelKey: "status.appointment.completed" },
  { key: "cancelled", labelKey: "status.appointment.cancelled" },
  { key: "noShow", labelKey: "status.appointment.noShow" },
];

export function DashboardPage() {
  const { user, hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const canViewFinancials = hasAnyRole(["Admin", "Receptionist"]);
  const isDoctor = user?.role === "Doctor";

  const [summary, setSummary] = useState<SectionState<DashboardSummary>>({ status: "loading" });
  const [today, setToday] = useState<SectionState<TodayClinic>>({ status: "loading" });
  const [breakdown, setBreakdown] = useState<SectionState<AppointmentStatusBreakdown>>({ status: "loading" });
  const [activity, setActivity] = useState<SectionState<RecentActivity>>({ status: "loading" });
  const [followUps, setFollowUps] = useState<SectionState<UpcomingFollowUp[]>>({ status: "loading" });
  const [revenue, setRevenue] = useState<SectionState<DashboardRevenue>>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    function load<T>(promise: Promise<{ data: T }>, set: (state: SectionState<T>) => void) {
      promise
        .then((response) => {
          if (isMounted) set({ status: "loaded", data: response.data });
        })
        .catch((error: unknown) => {
          if (isMounted) {
            const message = error instanceof ApiError ? error.message : t("common.unableToReachApi");
            set({ status: "error", message });
          }
        });
    }

    load(dashboardApi.getDashboardSummary(), setSummary);
    load(dashboardApi.getTodayClinic(), setToday);
    load(dashboardApi.getAppointmentStatusBreakdown(), setBreakdown);
    load(dashboardApi.getRecentActivity(), setActivity);
    load(dashboardApi.getUpcomingFollowUps(), setFollowUps);
    if (canViewFinancials) {
      load(dashboardApi.getDashboardRevenue(), setRevenue);
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewFinancials]);

  function renderSection<T>(state: SectionState<T>, render: (data: T) => React.ReactNode) {
    if (state.status === "loading") return <LoadingState />;
    if (state.status === "error")
      return <EmptyState title={t("dashboard.unableToLoadSection")} description={state.message} />;
    return render(state.data);
  }

  function renderAppointmentsTable(appointments: RecentAppointment[], emptyLabel: string) {
    if (appointments.length === 0) {
      return <EmptyState title={emptyLabel} />;
    }
    return (
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
              <th aria-label={t("common.actions")} />
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>{formatDate(appointment.appointmentDate)}</td>
                <td>
                  {appointment.startTime} - {appointment.endTime}
                </td>
                <td>{appointment.patientFullName}</td>
                <td>{appointment.doctorFullName}</td>
                <td>{appointment.serviceName}</td>
                <td>
                  <StatusBadge
                    label={t(APPOINTMENT_STATUS_LABEL_KEYS[appointment.status])}
                    variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
                  />
                </td>
                <td>
                  <Link className="dashboard-link" to={`/appointments/${appointment.id}`}>
                    {t("common.view")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const summaryData = summary.status === "loaded" ? summary.data : null;

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={
          user
            ? `${t("dashboard.welcomeBackName", { name: user.fullName })}${isDoctor ? ` ${t("dashboard.welcomeSubtitle")}` : ""}`
            : t("dashboard.welcomeGeneric")
        }
      />

      {summary.status === "loading" && <LoadingState />}
      {summary.status === "error" && (
        <EmptyState title={t("dashboard.unableToLoadSummary")} description={summary.message} />
      )}
      {summaryData && (
        <div className="dashboard-stats">
          <StatCard label={t("dashboard.statTodayAppointments")} value={summaryData.todayAppointments} />
          <StatCard
            label={t("dashboard.statActivePatients")}
            value={summaryData.activePatients}
            hint={t("dashboard.statNewThisMonth", { count: summaryData.newPatientsThisMonth })}
          />
          <StatCard label={t("dashboard.statInProgressVisits")} value={summaryData.inProgressVisits} />
          <StatCard
            label={t("dashboard.statCompletedThisMonth")}
            value={summaryData.completedAppointmentsThisMonth}
            hint={t("dashboard.statAppointmentsHint")}
          />
          {canViewFinancials && summaryData.unpaidInvoices !== null && (
            <StatCard
              label={t("dashboard.statUnpaidInvoices")}
              value={summaryData.unpaidInvoices}
              hint={
                summaryData.outstandingBalance !== null
                  ? t("dashboard.statOutstandingHint", { amount: formatMoney(summaryData.outstandingBalance) })
                  : undefined
              }
            />
          )}
          {canViewFinancials && summaryData.totalRevenueThisMonth !== null && (
            <StatCard
              label={t("dashboard.statRevenueThisMonth")}
              value={formatMoney(summaryData.totalRevenueThisMonth)}
              hint={t("dashboard.statInvoicesPaidHint", { count: summaryData.paidInvoicesThisMonth ?? 0 })}
            />
          )}
        </div>
      )}

      <div className="dashboard-main-grid">
        <Card title={t("dashboard.todaysSchedule")}>
          {renderSection(today, (data) => (
            <>
              <div className="dashboard-today-counts">
                <span>{data.totalAppointments} {t("dashboard.countTotal")}</span>
                <span>{data.arrived} {t("dashboard.countArrived")}</span>
                <span>{data.inProgress} {t("dashboard.countInProgress")}</span>
                <span>{data.completedToday} {t("dashboard.countCompleted")}</span>
                <span>{data.cancelledOrNoShowToday} {t("dashboard.countCancelledNoShow")}</span>
              </div>
              {renderAppointmentsTable(data.appointments, t("dashboard.noAppointmentsToday"))}
            </>
          ))}
        </Card>

        <Card title={t("dashboard.appointmentStatus")}>
          {renderSection(breakdown, (data) => {
            const total = BREAKDOWN_ITEMS.reduce((sum, item) => sum + data[item.key], 0);
            if (total === 0) {
              return <EmptyState title={t("dashboard.noAppointmentsYet")} />;
            }
            return (
              <div className="dashboard-breakdown">
                {BREAKDOWN_ITEMS.map((item) => (
                  <div key={item.key} className="dashboard-breakdown-row">
                    <span className="dashboard-breakdown-label">{t(item.labelKey)}</span>
                    <div className="dashboard-breakdown-track">
                      <div
                        className="dashboard-breakdown-fill"
                        style={{ width: `${Math.round((data[item.key] / total) * 100)}%` }}
                      />
                    </div>
                    <span className="dashboard-breakdown-count">{data[item.key]}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      </div>

      {canViewFinancials && revenue.status !== "error" && (
        <Card title={t("dashboard.finance")}>
          {renderSection(revenue, (data) => (
            <>
              <div className="dashboard-stats dashboard-finance-stats">
                <StatCard label={t("dashboard.statRevenueThisMonth")} value={formatMoney(data.currentMonthRevenue)} />
                <StatCard label={t("dashboard.statOutstandingThisMonth")} value={formatMoney(data.currentMonthOutstanding)} />
                <StatCard label={t("dashboard.statTotalCollected")} value={formatMoney(data.totalPaidAmount)} />
                <StatCard label={t("dashboard.statTotalOutstanding")} value={formatMoney(data.totalUnpaidAmount)} />
              </div>

              <div className="dashboard-finance-grid">
                <div>
                  <h4 className="dashboard-subheading">{t("dashboard.last6Months")}</h4>
                  <div className="dashboard-breakdown">
                    {(() => {
                      const max = Math.max(...data.monthlyRevenue.map((point) => point.totalPaid), 1);
                      return data.monthlyRevenue.map((point) => (
                        <div key={point.label} className="dashboard-breakdown-row">
                          <span className="dashboard-breakdown-label">{point.label}</span>
                          <div className="dashboard-breakdown-track">
                            <div
                              className="dashboard-breakdown-fill"
                              style={{ width: `${Math.round((point.totalPaid / max) * 100)}%` }}
                            />
                          </div>
                          <span className="dashboard-breakdown-count">{formatMoney(point.totalPaid)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="dashboard-subheading">{t("dashboard.recentlyPaidInvoices")}</h4>
                  {data.recentPaidInvoices.length === 0 ? (
                    <EmptyState title={t("dashboard.noPaidInvoicesYet")} />
                  ) : (
                    <div className="data-table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>{t("table.invoice")}</th>
                            <th>{t("table.patient")}</th>
                            <th>{t("table.total")}</th>
                            <th>{t("table.status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentPaidInvoices.map((invoice) => (
                            <tr key={invoice.id}>
                              <td>
                                <Link className="dashboard-link" to={`/invoices/${invoice.id}`}>
                                  {invoice.invoiceNumber}
                                </Link>
                              </td>
                              <td>{invoice.patientFullName}</td>
                              <td>{formatMoney(invoice.totalAmount)}</td>
                              <td>
                                <StatusBadge
                                  label={t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}
                                  variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ))}
        </Card>
      )}

      <div className="dashboard-activity-grid">
        <Card title={t("dashboard.recentAppointments")}>
          {renderSection(activity, (data) => renderAppointmentsTable(data.recentAppointments, t("dashboard.noAppointmentsYet")))}
        </Card>

        <Card title={t("dashboard.recentVisits")}>
          {renderSection(activity, (data) =>
            data.recentVisits.length === 0 ? (
              <EmptyState title={t("dashboard.noVisitsYet")} />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("table.date")}</th>
                      <th>{t("table.patient")}</th>
                      <th>{t("table.doctor")}</th>
                      <th>{t("table.status")}</th>
                      <th aria-label={t("common.actions")} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentVisits.map((visit) => (
                      <tr key={visit.id}>
                        <td>{formatDate(visit.visitDate)}</td>
                        <td>{visit.patientFullName}</td>
                        <td>{visit.doctorFullName}</td>
                        <td>
                          <StatusBadge
                            label={t(VISIT_STATUS_LABEL_KEYS[visit.status])}
                            variant={VISIT_STATUS_VARIANTS[visit.status]}
                          />
                        </td>
                        <td>
                          <Link className="dashboard-link" to={`/visits/${visit.id}`}>
                            {t("common.view")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          )}
        </Card>

        {canViewFinancials && (
          <Card title={t("dashboard.recentInvoices")}>
            {renderSection(activity, (data) =>
              data.recentInvoices.length === 0 ? (
                <EmptyState title={t("dashboard.noInvoicesYet")} />
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t("table.invoice")}</th>
                        <th>{t("table.patient")}</th>
                        <th>{t("table.total")}</th>
                        <th>{t("table.remaining")}</th>
                        <th>{t("table.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <Link className="dashboard-link" to={`/invoices/${invoice.id}`}>
                              {invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td>{invoice.patientFullName}</td>
                          <td>{formatMoney(invoice.totalAmount)}</td>
                          <td>{formatMoney(invoice.remainingAmount)}</td>
                          <td>
                            <StatusBadge
                              label={t(PAYMENT_STATUS_LABEL_KEYS[invoice.status])}
                              variant={PAYMENT_STATUS_VARIANTS[invoice.status]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            )}
          </Card>
        )}

        <Card title={t("dashboard.upcomingFollowups")}>
          {renderSection(followUps, (data) =>
            data.length === 0 ? (
              <EmptyState title={t("dashboard.noUpcomingFollowups")} />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("table.date")}</th>
                      <th>{t("table.patient")}</th>
                      <th>{t("table.phone")}</th>
                      <th>{t("table.doctor")}</th>
                      <th aria-label={t("common.actions")} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((followUp) => (
                      <tr key={followUp.visitId}>
                        <td>{formatDate(followUp.followUpDate)}</td>
                        <td>{followUp.patientFullName}</td>
                        <td>{followUp.patientPhoneNumber}</td>
                        <td>{followUp.doctorFullName}</td>
                        <td>
                          <Link className="dashboard-link" to={`/visits/${followUp.visitId}`}>
                            {t("common.view")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          )}
        </Card>
      </div>
    </>
  );
}
