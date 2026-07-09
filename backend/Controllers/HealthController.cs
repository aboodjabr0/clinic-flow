using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public HealthController(IWebHostEnvironment environment, IConfiguration configuration)
    {
        _environment = environment;
        _configuration = configuration;
    }

    [HttpGet]
    public ActionResult<ApiResponse<HealthResponseDto>> Get()
    {
        var appName = _configuration["AppName"] ?? "ClinicFlow.Api";

        var data = new HealthResponseDto
        {
            Status = "Healthy",
            AppName = appName,
            Environment = _environment.EnvironmentName,
            UtcTime = DateTime.UtcNow
        };

        return Ok(ApiResponse<HealthResponseDto>.Ok(data));
    }
}
