namespace ClinicFlow.Api.DTOs.AuditLogs;

public class AuditLogListItemDto
{
    public Guid Id { get; init; }
    public string? UserEmail { get; init; }
    public string? UserFullName { get; init; }
    public string? UserRole { get; init; }
    public required string Action { get; init; }
    public required string EntityType { get; init; }
    public string? EntityDisplayName { get; init; }
    public required string Summary { get; init; }
    public string? IpAddress { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
