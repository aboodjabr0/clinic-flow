using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Clinic;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/clinic-settings")]
[Authorize(Policy = "StaffOnly")]
public class ClinicSettingsController : ControllerBase
{
    private readonly IClinicSettingsService _clinicSettingsService;

    public ClinicSettingsController(IClinicSettingsService clinicSettingsService)
    {
        _clinicSettingsService = clinicSettingsService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<ClinicSettingsDto>>> Get()
    {
        var settings = await _clinicSettingsService.GetAsync();
        return Ok(ApiResponse<ClinicSettingsDto>.Ok(settings));
    }

    [HttpPut]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<ClinicSettingsDto>>> Update([FromBody] UpdateClinicSettingsDto request)
    {
        var (settings, error) = await _clinicSettingsService.UpdateAsync(request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<ClinicSettingsDto>.Ok(settings!, "Clinic settings updated"));
    }
}
