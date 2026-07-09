using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.DentalServices;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/dental-services")]
[Authorize(Policy = "StaffOnly")]
public class DentalServicesController : ControllerBase
{
    private readonly IDentalServiceCatalogService _serviceCatalog;

    public DentalServicesController(IDentalServiceCatalogService serviceCatalog)
    {
        _serviceCatalog = serviceCatalog;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<DentalServiceDto>>>> GetAll()
    {
        var services = await _serviceCatalog.GetAllAsync();
        return Ok(ApiResponse<List<DentalServiceDto>>.Ok(services));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<DentalServiceDto>>> GetById(Guid id)
    {
        var service = await _serviceCatalog.GetByIdAsync(id);
        if (service is null)
        {
            return NotFound(new ErrorResponse { Message = "Dental service not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DentalServiceDto>.Ok(service));
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<DentalServiceDto>>> Create([FromBody] CreateDentalServiceDto request)
    {
        var (service, error) = await _serviceCatalog.CreateAsync(request);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DentalServiceDto>.Ok(service!, "Dental service created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<DentalServiceDto>>> Update(Guid id, [FromBody] UpdateDentalServiceDto request)
    {
        var (service, error) = await _serviceCatalog.UpdateAsync(id, request);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (service is null)
        {
            return NotFound(new ErrorResponse { Message = "Dental service not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DentalServiceDto>.Ok(service, "Dental service updated"));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResponse<DentalServiceDto>>> SetStatus(Guid id, [FromBody] SetActiveStatusDto request)
    {
        var service = await _serviceCatalog.SetActiveStatusAsync(id, request.IsActive);
        if (service is null)
        {
            return NotFound(new ErrorResponse { Message = "Dental service not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<DentalServiceDto>.Ok(service, "Dental service status updated"));
    }
}
