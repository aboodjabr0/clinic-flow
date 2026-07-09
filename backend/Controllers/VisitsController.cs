using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Visits;
using ClinicFlow.Api.Entities;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Authorize(Policy = "StaffOnly")]
public class VisitsController : ControllerBase
{
    private readonly IVisitService _visitService;

    public VisitsController(IVisitService visitService)
    {
        _visitService = visitService;
    }

    [HttpGet("api/visits")]
    public async Task<ActionResult<ApiResponse<PaginatedResponse<VisitListItemDto>>>> GetAll([FromQuery] VisitQueryDto query)
    {
        var (result, error) = await _visitService.GetVisitsAsync(query);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PaginatedResponse<VisitListItemDto>>.Ok(result!));
    }

    [HttpGet("api/visits/stats")]
    public async Task<ActionResult<ApiResponse<VisitStatsDto>>> GetStats()
    {
        var stats = await _visitService.GetVisitStatsAsync();
        return Ok(ApiResponse<VisitStatsDto>.Ok(stats));
    }

    [HttpGet("api/visits/{id:guid}")]
    public async Task<ActionResult<ApiResponse<VisitDto>>> GetById(Guid id)
    {
        var visit = await _visitService.GetVisitByIdAsync(id);
        if (visit is null)
        {
            return NotFound(new ErrorResponse { Message = "Visit not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<VisitDto>.Ok(visit));
    }

    [HttpGet("api/appointments/{appointmentId:guid}/visit")]
    public async Task<ActionResult<ApiResponse<VisitDto>>> GetByAppointmentId(Guid appointmentId)
    {
        var visit = await _visitService.GetVisitByAppointmentIdAsync(appointmentId);
        if (visit is null)
        {
            return NotFound(new ErrorResponse { Message = "No visit exists for this appointment.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<VisitDto>.Ok(visit));
    }

    [HttpGet("api/patients/{patientId:guid}/visits")]
    public async Task<ActionResult<ApiResponse<List<VisitListItemDto>>>> GetForPatient(Guid patientId)
    {
        var visits = await _visitService.GetPatientVisitsAsync(patientId);
        return Ok(ApiResponse<List<VisitListItemDto>>.Ok(visits));
    }

    [HttpPost("api/appointments/{appointmentId:guid}/visit/start")]
    [Authorize(Policy = "AdminOrDoctor")]
    public async Task<ActionResult<ApiResponse<VisitDto>>> StartVisit(Guid appointmentId, [FromBody] StartVisitDto request)
    {
        var (restrictToDoctorProfileId, restrictionError) = await ResolveDoctorRestrictionAsync();
        if (restrictionError is not null)
        {
            return Forbid();
        }

        var (visit, error, forbidden) = await _visitService.StartVisitAsync(appointmentId, request, restrictToDoctorProfileId);
        if (forbidden)
        {
            return Forbid();
        }

        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (visit is null)
        {
            return NotFound(new ErrorResponse { Message = "Appointment not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<VisitDto>.Ok(visit, "Visit started"));
    }

    [HttpPut("api/visits/{id:guid}")]
    [Authorize(Policy = "AdminOrDoctor")]
    public async Task<ActionResult<ApiResponse<VisitDto>>> Update(Guid id, [FromBody] UpdateVisitDto request)
    {
        var (restrictToDoctorProfileId, restrictionError) = await ResolveDoctorRestrictionAsync();
        if (restrictionError is not null)
        {
            return Forbid();
        }

        var (visit, error, forbidden) = await _visitService.UpdateVisitAsync(id, request, restrictToDoctorProfileId);
        if (forbidden)
        {
            return Forbid();
        }

        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (visit is null)
        {
            return NotFound(new ErrorResponse { Message = "Visit not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<VisitDto>.Ok(visit, "Visit updated"));
    }

    [HttpPatch("api/visits/{id:guid}/complete")]
    [Authorize(Policy = "AdminOrDoctor")]
    public async Task<ActionResult<ApiResponse<VisitDto>>> Complete(Guid id, [FromBody] CompleteVisitDto request)
    {
        var (restrictToDoctorProfileId, restrictionError) = await ResolveDoctorRestrictionAsync();
        if (restrictionError is not null)
        {
            return Forbid();
        }

        var (visit, error, forbidden) = await _visitService.CompleteVisitAsync(id, request, restrictToDoctorProfileId);
        if (forbidden)
        {
            return Forbid();
        }

        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (visit is null)
        {
            return NotFound(new ErrorResponse { Message = "Visit not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<VisitDto>.Ok(visit, "Visit completed"));
    }

    /// <summary>
    /// Admins have no restriction (returns null DoctorProfileId). Doctors are
    /// restricted to their own linked DoctorProfile; a Doctor login with no
    /// linked profile is rejected outright since ownership can't be verified.
    /// </summary>
    private async Task<(Guid? DoctorProfileId, string? Error)> ResolveDoctorRestrictionAsync()
    {
        if (!User.IsInRole(nameof(UserRole.Doctor)))
        {
            return (null, null);
        }

        var appUserIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(appUserIdClaim, out var appUserId))
        {
            return (null, "Unable to identify the current user.");
        }

        var doctorProfileId = await _visitService.GetDoctorProfileIdForAppUserAsync(appUserId);
        if (doctorProfileId is null)
        {
            return (null, "No doctor profile is linked to this account.");
        }

        return (doctorProfileId, null);
    }
}
