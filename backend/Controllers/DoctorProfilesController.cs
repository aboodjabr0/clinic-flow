using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Doctors;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/doctors")]
[Authorize(Policy = "StaffOnly")]
public class DoctorProfilesController : ControllerBase
{
    private readonly IDoctorService _doctorService;

    public DoctorProfilesController(IDoctorService doctorService)
    {
        _doctorService = doctorService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<DoctorDto>>>> GetAll()
    {
        var doctors = await _doctorService.GetAllAsync();
        return Ok(ApiResponse<List<DoctorDto>>.Ok(doctors));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> GetById(Guid id)
    {
        var doctor = await _doctorService.GetByIdAsync(id);
        if (doctor is null)
        {
            return NotFound(new ErrorResponse { Message = "Doctor not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DoctorDto>.Ok(doctor));
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> Create([FromBody] CreateDoctorDto request)
    {
        var (doctor, error) = await _doctorService.CreateAsync(request);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DoctorDto>.Ok(doctor!, "Doctor created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> Update(Guid id, [FromBody] UpdateDoctorDto request)
    {
        var (doctor, error) = await _doctorService.UpdateAsync(id, request);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (doctor is null)
        {
            return NotFound(new ErrorResponse { Message = "Doctor not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DoctorDto>.Ok(doctor, "Doctor updated"));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> SetStatus(Guid id, [FromBody] SetActiveStatusDto request)
    {
        var doctor = await _doctorService.SetActiveStatusAsync(id, request.IsActive);
        if (doctor is null)
        {
            return NotFound(new ErrorResponse { Message = "Doctor not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DoctorDto>.Ok(doctor, "Doctor status updated"));
    }
}
