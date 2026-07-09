using ClinicFlow.Api.DTOs.AuditLogs;
using ClinicFlow.Api.DTOs.Common;

namespace ClinicFlow.Api.Services;

public interface IAuditLogService
{
    /// <summary>
    /// Records an audit entry. User identity fields default to the current
    /// request's authenticated principal; pass an override only when logging
    /// on behalf of a not-yet-authenticated attempt (e.g. a failed login).
    /// Never throws — a logging failure must not break the calling operation.
    /// </summary>
    Task LogAsync(
        string action,
        string entityType,
        Guid? entityId,
        string? entityDisplayName,
        string summary,
        Guid? userIdOverride = null,
        string? userEmailOverride = null,
        string? userFullNameOverride = null,
        string? userRoleOverride = null);

    Task<PaginatedResponse<AuditLogListItemDto>> GetAuditLogsAsync(AuditLogQueryDto query);

    Task<AuditLogDto?> GetAuditLogByIdAsync(Guid id);
}
