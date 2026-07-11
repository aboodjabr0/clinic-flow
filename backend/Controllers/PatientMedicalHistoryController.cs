using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/patients/{patientId:guid}/medical-history")]
[Authorize(Policy = "StaffOnly")]
public class PatientMedicalHistoryController : ControllerBase
{
    private readonly IPatientMedicalHistoryService _medicalHistoryService;

    public PatientMedicalHistoryController(IPatientMedicalHistoryService medicalHistoryService)
    {
        _medicalHistoryService = medicalHistoryService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PatientMedicalHistoryDto>>> Get(Guid patientId)
    {
        var history = await _medicalHistoryService.GetByPatientIdAsync(patientId);
        if (history is null)
        {
            return NotFound(new ErrorResponse { Message = "Patient not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientMedicalHistoryDto>.Ok(history));
    }

    [HttpPut]
    [Authorize(Policy = "AdminOrDoctor")]
    public async Task<ActionResult<ApiResponse<PatientMedicalHistoryDto>>> Upsert(
        Guid patientId, [FromBody] UpsertPatientMedicalHistoryDto request)
    {
        var (history, error) = await _medicalHistoryService.UpsertAsync(patientId, request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (history is null)
        {
            return NotFound(new ErrorResponse { Message = "Patient not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PatientMedicalHistoryDto>.Ok(history, "Medical history saved"));
    }
}
