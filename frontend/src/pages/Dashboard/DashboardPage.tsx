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
import { formatDate } from "../../utils/patient";
import { formatMoney, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS } from "../../utils/invoice";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_VARIANTS } from "../../utils/appointment";
import { VISIT_STATUS_LABELS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
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

const BREAKDOWN_ITEMS: { key: keyof AppointmentStatusBreakdown; label: string }[] = [
  { key: "scheduled", label: "Scheduled" },
  { key: "arrived", label: "Arrived" },
  { key: "inProgress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "noShow", label: "No Show" },
];

export function DashboardPage() {
  const { user, hasAnyRole } = useAuth();
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
            const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
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
  }, [canViewFinancials]);

  function renderSection<T>(state: SectionState<T>, render: (data: T) => React.ReactNode) {
    if (state.status === "loading") return <LoadingState />;
    if (state.status === "error") return <EmptyState title="Unable to load this section" description={state.message} />;
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
              <th>Date</th>
              <th>Time</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Service</th>
              <th>Status</th>
              <th aria-label="Actions" />
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
                    label={APPOINTMENT_STATUS_LABELS[appointment.status]}
                    variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}
                  />
                </td>
                <td>
                  <Link className="dashboard-link" to={`/appointments/${appointment.id}`}>
                    View
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
        title="Dashboard"
        subtitle={
          user
            ? `Welcome back, ${user.fullName}.${isDoctor ? " Showing your appointments and visits." : ""}`
            : "Welcome back to ClinicFlow."
        }
      />

      {summary.status === "loading" && <LoadingState label="Loading dashboard..." />}
      {summary.status === "error" && (
        <EmptyState title="Unable to load dashboard summary" description={summary.message} />
      )}
      {summaryData && (
        <div className="dashboard-stats">
          <StatCard label="Today's Appointments" value={summaryData.todayAppointments} />
          <StatCard
            label="Active Patients"
            value={summaryData.activePatients}
            hint={`${summaryData.newPatientsThisMonth} new this month`}
          />
          <StatCard label="In-Progress Visits" value={summaryData.inProgressVisits} />
          <StatCard
            label="Completed This Month"
            value={summaryData.completedAppointmentsThisMonth}
            hint="Appointments"
          />
          {canViewFinancials && summaryData.unpaidInvoices !== null && (
            <StatCard
              label="Unpaid Invoices"
              value={summaryData.unpaidInvoices}
              hint={
                summaryData.outstandingBalance !== null
                  ? `${formatMoney(summaryData.outstandingBalance)} outstanding`
                  : undefined
              }
            />
          )}
          {canViewFinancials && summaryData.totalRevenueThisMonth !== null && (
            <StatCard
              label="Revenue This Month"
              value={formatMoney(summaryData.totalRevenueThisMonth)}
              hint={`${summaryData.paidInvoicesThisMonth ?? 0} invoices paid`}
            />
          )}
        </div>
      )}

      <div className="dashboard-main-grid">
        <Card title="Today's Schedule">
          {renderSection(today, (data) => (
            <>
              <div className="dashboard-today-counts">
                <span>{data.totalAppointments} total</span>
                <span>{data.arrived} arrived</span>
                <span>{data.inProgress} in progress</span>
                <span>{data.completedToday} completed</span>
                <span>{data.cancelledOrNoShowToday} cancelled / no-show</span>
              </div>
              {renderAppointmentsTable(data.appointments, "No appointments scheduled for today")}
            </>
          ))}
        </Card>

        <Card title="Appointment Status">
          {renderSection(breakdown, (data) => {
            const total = BREAKDOWN_ITEMS.reduce((sum, item) => sum + data[item.key], 0);
            if (total === 0) {
              return <EmptyState title="No appointments yet" />;
            }
            return (
              <div className="dashboard-breakdown">
                {BREAKDOWN_ITEMS.map((item) => (
                  <div key={item.key} className="dashboard-breakdown-row">
                    <span className="dashboard-breakdown-label">{item.label}</span>
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
        <Card title="Finance">
          {renderSection(revenue, (data) => (
            <>
              <div className="dashboard-stats dashboard-finance-stats">
                <StatCard label="Revenue This Month" value={formatMoney(data.currentMonthRevenue)} />
                <StatCard label="Outstanding This Month" value={formatMoney(data.currentMonthOutstanding)} />
                <StatCard label="Total Collected" value={formatMoney(data.totalPaidAmount)} />
                <StatCard label="Total Outstanding" value={formatMoney(data.totalUnpaidAmount)} />
              </div>

              <div className="dashboard-finance-grid">
                <div>
                  <h4 className="dashboard-subheading">Last 6 Months</h4>
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
                  <h4 className="dashboard-subheading">Recently Paid Invoices</h4>
                  {data.recentPaidInvoices.length === 0 ? (
                    <EmptyState title="No paid invoices yet" />
                  ) : (
                    <div className="data-table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Invoice</th>
                            <th>Patient</th>
                            <th>Total</th>
                            <th>Status</th>
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
                                  label={PAYMENT_STATUS_LABELS[invoice.status]}
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
        <Card title="Recent Appointments">
          {renderSection(activity, (data) => renderAppointmentsTable(data.recentAppointments, "No appointments yet"))}
        </Card>

        <Card title="Recent Visits">
          {renderSection(activity, (data) =>
            data.recentVisits.length === 0 ? (
              <EmptyState title="No visits yet" />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
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
                            label={VISIT_STATUS_LABELS[visit.status]}
                            variant={VISIT_STATUS_VARIANTS[visit.status]}
                          />
                        </td>
                        <td>
                          <Link className="dashboard-link" to={`/visits/${visit.id}`}>
                            View
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
          <Card title="Recent Invoices">
            {renderSection(activity, (data) =>
              data.recentInvoices.length === 0 ? (
                <EmptyState title="No invoices yet" />
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Patient</th>
                        <th>Total</th>
                        <th>Remaining</th>
                        <th>Status</th>
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
                              label={PAYMENT_STATUS_LABELS[invoice.status]}
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

        <Card title="Upcoming Follow-ups">
          {renderSection(followUps, (data) =>
            data.length === 0 ? (
              <EmptyState title="No upcoming follow-ups" />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Phone</th>
                      <th>Doctor</th>
                      <th aria-label="Actions" />
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
                            View
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
