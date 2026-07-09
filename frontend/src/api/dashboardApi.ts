import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/health";
import type {
  AppointmentStatusBreakdown,
  DashboardRevenue,
  DashboardSummary,
  RecentActivity,
  TodayClinic,
  UpcomingFollowUp,
} from "../types/dashboard";

export const dashboardApi = {
  getDashboardSummary: () => apiClient.get<ApiEnvelope<DashboardSummary>>("/api/dashboard/summary"),

  getTodayClinic: () => apiClient.get<ApiEnvelope<TodayClinic>>("/api/dashboard/today"),

  /** Admin/Receptionist only — returns 403 for Doctor logins. */
  getDashboardRevenue: () => apiClient.get<ApiEnvelope<DashboardRevenue>>("/api/dashboard/revenue"),

  getAppointmentStatusBreakdown: () =>
    apiClient.get<ApiEnvelope<AppointmentStatusBreakdown>>("/api/dashboard/appointments/status-breakdown"),

  getRecentActivity: () => apiClient.get<ApiEnvelope<RecentActivity>>("/api/dashboard/recent-activity"),

  getUpcomingFollowUps: () => apiClient.get<ApiEnvelope<UpcomingFollowUp[]>>("/api/dashboard/follow-ups"),
};
