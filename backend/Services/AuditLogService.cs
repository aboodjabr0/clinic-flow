using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.AuditLogs;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class AuditLogService : IAuditLogService
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(AppDbContext context, ICurrentUserService currentUser, ILogger<AuditLogService> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        Guid? entityId,
        string? entityDisplayName,
        string summary,
        Guid? userIdOverride = null,
        string? userEmailOverride = null,
        string? userFullNameOverride = null,
        string? userRoleOverride = null)
    {
        try
        {
            var entry = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userIdOverride ?? _currentUser.UserId,
                UserEmail = userEmailOverride ?? _currentUser.Email,
                UserFullName = userFullNameOverride ?? _currentUser.FullName,
                UserRole = userRoleOverride ?? _currentUser.Role,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                EntityDisplayName = entityDisplayName,
                Summary = summary,
                IpAddress = _currentUser.IpAddress,
                UserAgent = _currentUser.UserAgent,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.AuditLogs.Add(entry);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write audit log entry for {Action} {EntityType}", action, entityType);
        }
    }

    public async Task<PaginatedResponse<AuditLogListItemDto>> GetAuditLogsAsync(AuditLogQueryDto query)
    {
        var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize < 1 ? 10 : Math.Min(query.PageSize, MaxPageSize);

        var logs = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            logs = logs.Where(a =>
                a.Summary.ToLower().Contains(search) ||
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(search)) ||
                (a.UserFullName != null && a.UserFullName.ToLower().Contains(search)) ||
                (a.EntityDisplayName != null && a.EntityDisplayName.ToLower().Contains(search)) ||
                a.Action.ToLower().Contains(search) ||
                a.EntityType.ToLower().Contains(search));
        }

        if (query.UserId.HasValue)
        {
            logs = logs.Where(a => a.UserId == query.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            logs = logs.Where(a => a.EntityType == query.EntityType);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            logs = logs.Where(a => a.Action == query.Action);
        }

        if (query.FromDate.HasValue)
        {
            var fromUtc = query.FromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            logs = logs.Where(a => a.CreatedAtUtc >= fromUtc);
        }

        if (query.ToDate.HasValue)
        {
            var toUtc = query.ToDate.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            logs = logs.Where(a => a.CreatedAtUtc <= toUtc);
        }

        var totalCount = await logs.CountAsync();

        var items = await logs
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => ToListItemDto(a))
            .ToListAsync();

        return new PaginatedResponse<AuditLogListItemDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<AuditLogDto?> GetAuditLogByIdAsync(Guid id)
    {
        var log = await _context.AuditLogs.FindAsync(id);
        return log is null ? null : ToDto(log);
    }

    private static AuditLogListItemDto ToListItemDto(AuditLog log) => new()
    {
        Id = log.Id,
        UserEmail = log.UserEmail,
        UserFullName = log.UserFullName,
        UserRole = log.UserRole,
        Action = log.Action,
        EntityType = log.EntityType,
        EntityDisplayName = log.EntityDisplayName,
        Summary = log.Summary,
        IpAddress = log.IpAddress,
        CreatedAtUtc = log.CreatedAtUtc
    };

    private static AuditLogDto ToDto(AuditLog log) => new()
    {
        Id = log.Id,
        UserId = log.UserId,
        UserEmail = log.UserEmail,
        UserFullName = log.UserFullName,
        UserRole = log.UserRole,
        Action = log.Action,
        EntityType = log.EntityType,
        EntityId = log.EntityId,
        EntityDisplayName = log.EntityDisplayName,
        Summary = log.Summary,
        IpAddress = log.IpAddress,
        UserAgent = log.UserAgent,
        CreatedAtUtc = log.CreatedAtUtc
    };
}
