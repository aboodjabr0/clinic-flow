using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize(Policy = "StaffOnly")]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PaginatedResponse<PatientListItemDto>>>> GetAll([FromQuery] PatientQueryDto query)
    {
        var (result, error) = await _patientService.GetPatientsAsync(query);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PaginatedResponse<PatientListItemDto>>.Ok(result!));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<PatientStatsDto>>> GetStats()
    {
        var stats = await _patientService.GetPatientStatsAsync();
        return Ok(ApiResponse<PatientStatsDto>.Ok(stats));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> GetById(Guid id)
    {
        var patient = await _patientService.GetPatientByIdAsync(id);
        if (patient is null)
        {
            return NotFound(new ErrorResponse { Message = "Patient not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientDto>.Ok(patient));
    }

    [HttpPost]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> Create([FromBody] CreatePatientDto request)
    {
        var (patient, error) = await _patientService.CreatePatientAsync(request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientDto>.Ok(patient!, "Patient created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> Update(Guid id, [FromBody] UpdatePatientDto request)
    {
        var (patient, error) = await _patientService.UpdatePatientAsync(id, request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (patient is null)
        {
            return NotFound(new ErrorResponse { Message = "Patient not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientDto>.Ok(patient, "Patient updated"));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> SetStatus(Guid id, [FromBody] SetActiveStatusDto request)
    {
        var patient = await _patientService.SetPatientActiveStatusAsync(id, request.IsActive);
        if (patient is null)
        {
            return NotFound(new ErrorResponse { Message = "Patient not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientDto>.Ok(patient, "Patient status updated"));
    }
}
