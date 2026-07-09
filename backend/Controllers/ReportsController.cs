using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Reports;
using ClinicFlow.Api.Entities;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

/// <summary>
/// Simple JSON reports. The appointment report is available to all staff
/// (Doctors see only their own appointments); revenue and patient reports are
/// Admin/Receptionist only.
/// </summary>
[ApiController]
[Authorize(Policy = "StaffOnly")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("api/reports/appointments")]
    public async Task<ActionResult<ApiResponse<AppointmentReportDto>>> GetAppointmentReport([FromQuery] ReportQueryDto query)
    {
        var doctorScope = await ResolveDoctorScopeAsync();

        var (report, error) = await _reportService.GetAppointmentReportAsync(query, doctorScope);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AppointmentReportDto>.Ok(report!));
    }

    [HttpGet("api/reports/revenue")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<RevenueReportDto>>> GetRevenueReport([FromQuery] ReportQueryDto query)
    {
        var (report, error) = await _reportService.GetRevenueReportAsync(query);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<RevenueReportDto>.Ok(report!));
    }

    [HttpGet("api/reports/patients")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<PatientReportDto>>> GetPatientReport([FromQuery] ReportQueryDto query)
    {
        var (report, error) = await _reportService.GetPatientReportAsync(query);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientReportDto>.Ok(report!));
    }

    /// <summary>
    /// Doctors are always restricted to their own DoctorProfile — any doctorId
    /// query filter they send is ignored. A Doctor login with no linked
    /// profile gets Guid.Empty, which matches no rows (empty report).
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

        return await _reportService.GetDoctorProfileIdForAppUserAsync(appUserId) ?? Guid.Empty;
    }
}
