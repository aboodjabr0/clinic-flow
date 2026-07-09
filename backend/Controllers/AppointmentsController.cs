using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.Entities;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Authorize(Policy = "StaffOnly")]
public class AppointmentsController : ControllerBase
{
    /// <summary>
    /// Which appointment statuses each non-Admin role is allowed to set via
    /// PATCH /status. Admin can set any status.
    /// </summary>
    private static readonly Dictionary<string, AppointmentStatus[]> AllowedStatusTransitionsByRole = new()
    {
        [nameof(UserRole.Receptionist)] =
            [AppointmentStatus.Scheduled, AppointmentStatus.Arrived, AppointmentStatus.Cancelled, AppointmentStatus.NoShow],
        [nameof(UserRole.Doctor)] =
            [AppointmentStatus.InProgress, AppointmentStatus.Completed],
    };

    private readonly IAppointmentService _appointmentService;

    public AppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet("api/appointments")]
    public async Task<ActionResult<ApiResponse<PaginatedResponse<AppointmentListItemDto>>>> GetAll([FromQuery] AppointmentQueryDto query)
    {
        var (result, error) = await _appointmentService.GetAppointmentsAsync(query);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PaginatedResponse<AppointmentListItemDto>>.Ok(result!));
    }

    [HttpGet("api/appointments/today")]
    public async Task<ActionResult<ApiResponse<List<AppointmentListItemDto>>>> GetToday()
    {
        var appointments = await _appointmentService.GetTodayAppointmentsAsync();
        return Ok(ApiResponse<List<AppointmentListItemDto>>.Ok(appointments));
    }

    [HttpGet("api/appointments/stats")]
    public async Task<ActionResult<ApiResponse<AppointmentStatsDto>>> GetStats()
    {
        var stats = await _appointmentService.GetAppointmentStatsAsync();
        return Ok(ApiResponse<AppointmentStatsDto>.Ok(stats));
    }

    [HttpGet("api/appointments/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> GetById(Guid id)
    {
        var appointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (appointment is null)
        {
            return NotFound(new ErrorResponse { Message = "Appointment not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AppointmentDto>.Ok(appointment));
    }

    [HttpGet("api/patients/{patientId:guid}/appointments")]
    public async Task<ActionResult<ApiResponse<List<AppointmentListItemDto>>>> GetForPatient(Guid patientId)
    {
        var appointments = await _appointmentService.GetPatientAppointmentsAsync(patientId);
        return Ok(ApiResponse<List<AppointmentListItemDto>>.Ok(appointments));
    }

    [HttpPost("api/appointments")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Create([FromBody] CreateAppointmentDto request)
    {
        var (appointment, error) = await _appointmentService.CreateAppointmentAsync(request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AppointmentDto>.Ok(appointment!, "Appointment created"));
    }

    [HttpPut("api/appointments/{id:guid}")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Update(Guid id, [FromBody] UpdateAppointmentDto request)
    {
        var (appointment, error) = await _appointmentService.UpdateAppointmentAsync(id, request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (appointment is null)
        {
            return NotFound(new ErrorResponse { Message = "Appointment not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AppointmentDto>.Ok(appointment, "Appointment updated"));
    }

    [HttpPatch("api/appointments/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> UpdateStatus(Guid id, [FromBody] UpdateAppointmentStatusDto request)
    {
        if (!Enum.TryParse<AppointmentStatus>(request.Status, ignoreCase: true, out var parsedStatus))
        {
            return BadRequest(new ErrorResponse { Message = "Invalid appointment status.", TraceId = HttpContext.TraceIdentifier });
        }

        if (!User.IsInRole(nameof(UserRole.Admin)) && !IsStatusAllowedForCurrentUser(parsedStatus))
        {
            return Forbid();
        }

        var (appointment, error) = await _appointmentService.UpdateAppointmentStatusAsync(id, request.Status);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (appointment is null)
        {
            return NotFound(new ErrorResponse { Message = "Appointment not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AppointmentDto>.Ok(appointment, "Appointment status updated"));
    }

    [HttpPatch("api/appointments/{id:guid}/cancel")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Cancel(Guid id, [FromBody] CancelAppointmentDto request)
    {
        var (appointment, error) = await _appointmentService.CancelAppointmentAsync(id, request.CancellationReason);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (appointment is null)
        {
            return NotFound(new ErrorResponse { Message = "Appointment not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AppointmentDto>.Ok(appointment, "Appointment cancelled"));
    }

    private bool IsStatusAllowedForCurrentUser(AppointmentStatus status)
    {
        foreach (var (role, allowedStatuses) in AllowedStatusTransitionsByRole)
        {
            if (User.IsInRole(role) && allowedStatuses.Contains(status))
            {
                return true;
            }
        }

        return false;
    }
}
