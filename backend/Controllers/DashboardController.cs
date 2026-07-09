using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Dashboard;
using ClinicFlow.Api.Entities;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

/// <summary>
/// Read-only dashboard aggregations. All staff can see operational data;
/// Doctors are scoped to their own linked DoctorProfile and never receive
/// financial data — revenue is Admin/Receptionist only, and the summary's
/// financial fields are null for Doctors.
/// </summary>
[ApiController]
[Authorize(Policy = "StaffOnly")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("api/dashboard/summary")]
    public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> GetSummary()
    {
        var doctorScope = await ResolveDoctorScopeAsync();
        var summary = await _dashboardService.GetSummaryAsync(doctorScope, includeFinancials: CanViewFinancials());
        return Ok(ApiResponse<DashboardSummaryDto>.Ok(summary));
    }

    [HttpGet("api/dashboard/today")]
    public async Task<ActionResult<ApiResponse<TodayClinicDto>>> GetToday()
    {
        var doctorScope = await ResolveDoctorScopeAsync();
        var today = await _dashboardService.GetTodayAsync(doctorScope);
        return Ok(ApiResponse<TodayClinicDto>.Ok(today));
    }

    [HttpGet("api/dashboard/revenue")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<DashboardRevenueDto>>> GetRevenue()
    {
        var revenue = await _dashboardService.GetRevenueAsync();
        return Ok(ApiResponse<DashboardRevenueDto>.Ok(revenue));
    }

    [HttpGet("api/dashboard/appointments/status-breakdown")]
    public async Task<ActionResult<ApiResponse<AppointmentStatusBreakdownDto>>> GetStatusBreakdown()
    {
        var doctorScope = await ResolveDoctorScopeAsync();
        var breakdown = await _dashboardService.GetStatusBreakdownAsync(doctorScope);
        return Ok(ApiResponse<AppointmentStatusBreakdownDto>.Ok(breakdown));
    }

    [HttpGet("api/dashboard/recent-activity")]
    public async Task<ActionResult<ApiResponse<RecentActivityDto>>> GetRecentActivity()
    {
        var doctorScope = await ResolveDoctorScopeAsync();
        var activity = await _dashboardService.GetRecentActivityAsync(doctorScope, includeInvoices: CanViewFinancials());
        return Ok(ApiResponse<RecentActivityDto>.Ok(activity));
    }

    [HttpGet("api/dashboard/follow-ups")]
    public async Task<ActionResult<ApiResponse<List<UpcomingFollowUpDto>>>> GetFollowUps()
    {
        var doctorScope = await ResolveDoctorScopeAsync();
        var followUps = await _dashboardService.GetUpcomingFollowUpsAsync(doctorScope);
        return Ok(ApiResponse<List<UpcomingFollowUpDto>>.Ok(followUps));
    }

    private bool CanViewFinancials() =>
        User.IsInRole(nameof(UserRole.Admin)) || User.IsInRole(nameof(UserRole.Receptionist));

    /// <summary>
    /// Admin/Receptionist see clinic-wide data (null). Doctors are scoped to
    /// their linked DoctorProfile; a Doctor login with no linked profile gets
    /// Guid.Empty, which matches no rows — empty data instead of clinic-wide.
    /// </summary>
    private async Task<Guid?> ResolveDoctorScopeAsync()
    {
        if (!User.IsInRole(nameof(UserRole.Doctor)))
        {
            return null;
        }

        var appUserIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(appUserIdClaim, out var appUserId))
        {
            return Guid.Empty;
        }

        return await _dashboardService.GetDoctorProfileIdForAppUserAsync(appUserId) ?? Guid.Empty;
    }
}
