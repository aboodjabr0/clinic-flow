namespace ClinicFlow.Api.Entities;

/// <summary>
/// A single audit trail entry recording who did what, to which entity, and
/// when. Summaries must never contain medical note content, diagnoses,
/// prescriptions, or secrets — see AuditLogService for the safe-summary
/// convention used by callers.
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? UserFullName { get; set; }
    public string? UserRole { get; set; }

    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? EntityDisplayName { get; set; }
    public required string Summary { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
