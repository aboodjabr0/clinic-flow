namespace ClinicFlow.Api.DTOs.AuditLogs;

/// <summary>Bound from query string parameters on GET /api/audit-logs.</summary>
public class AuditLogQueryDto
{
    public string? Search { get; init; }
    public Guid? UserId { get; init; }
    public string? EntityType { get; init; }
    public string? Action { get; init; }
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}
