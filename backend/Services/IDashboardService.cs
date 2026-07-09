using ClinicFlow.Api.DTOs.Dashboard;

namespace ClinicFlow.Api.Services;

/// <summary>
/// Read-only dashboard aggregations. Every method that takes
/// <c>restrictToDoctorProfileId</c> scopes appointment/visit data to that
/// doctor when a value is provided (null = clinic-wide, used for
/// Admin/Receptionist).
/// </summary>
public interface IDashboardService
{
    Task<Guid?> GetDoctorProfileIdForAppUserAsync(Guid appUserId);
    Task<DashboardSummaryDto> GetSummaryAsync(Guid? restrictToDoctorProfileId, bool includeFinancials);
    Task<TodayClinicDto> GetTodayAsync(Guid? restrictToDoctorProfileId);
    Task<DashboardRevenueDto> GetRevenueAsync();
    Task<AppointmentStatusBreakdownDto> GetStatusBreakdownAsync(Guid? restrictToDoctorProfileId);
    Task<RecentActivityDto> GetRecentActivityAsync(Guid? restrictToDoctorProfileId, bool includeInvoices);
    Task<List<UpcomingFollowUpDto>> GetUpcomingFollowUpsAsync(Guid? restrictToDoctorProfileId);
}
