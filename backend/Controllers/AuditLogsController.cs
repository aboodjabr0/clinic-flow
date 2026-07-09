using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.AuditLogs;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

/// <summary>
/// Audit log entries are created internally by services only — there are no
/// create/update/delete endpoints here, and access is Admin-only.
/// </summary>
[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = "AdminOnly")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PaginatedResponse<AuditLogListItemDto>>>> GetAll([FromQuery] AuditLogQueryDto query)
    {
        var result = await _auditLogService.GetAuditLogsAsync(query);
        return Ok(ApiResponse<PaginatedResponse<AuditLogListItemDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<AuditLogDto>>> GetById(Guid id)
    {
        var log = await _auditLogService.GetAuditLogByIdAsync(id);
        if (log is null)
        {
            return NotFound(new ErrorResponse { Message = "Audit log entry not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AuditLogDto>.Ok(log));
    }
}
