using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Users;
using ClinicFlow.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IAuditLogService _auditLogService;

    public UserService(
        AppDbContext context,
        IPasswordHasher<AppUser> passwordHasher,
        IAuditLogService auditLogService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
    }

    public async Task<List<UserDto>> GetAllAsync(UserQueryDto query)
    {
        var usersQuery = _context.AppUsers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            usersQuery = usersQuery.Where(u =>
                u.FullName.ToLower().Contains(search) || u.Email.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Role) && Enum.TryParse<UserRole>(query.Role, ignoreCase: true, out var roleFilter))
        {
            usersQuery = usersQuery.Where(u => u.Role == roleFilter);
        }

        if (query.IsActive is not null)
        {
            usersQuery = usersQuery.Where(u => u.IsActive == query.IsActive.Value);
        }

        var users = await usersQuery.OrderBy(u => u.FullName).ToListAsync();
        var profilesByUserId = await GetLinkedProfilesAsync(users.Select(u => u.Id));

        return users.Select(u => ToDto(u, profilesByUserId.GetValueOrDefault(u.Id))).ToList();
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _context.AppUsers.FindAsync(id);
        if (user is null)
        {
            return null;
        }

        var profile = await _context.DoctorProfiles.SingleOrDefaultAsync(d => d.AppUserId == id);
        return ToDto(user, profile);
    }

    public async Task<(UserDto? User, string? Error)> CreateAsync(CreateUserDto request)
    {
        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role))
        {
            return (null, "Role is not a valid value.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailTaken = await _context.AppUsers.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailTaken)
        {
            return (null, "A user with this email already exists.");
        }

        var linkError = await ValidateDoctorProfileLinkAsync(request.DoctorProfileId, excludingUserId: null);
        if (linkError is not null)
        {
            return (null, linkError);
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PasswordHash = string.Empty,
            Role = role,
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.AppUsers.Add(user);

        DoctorProfile? linkedProfile = null;
        if (request.DoctorProfileId is not null)
        {
            linkedProfile = await _context.DoctorProfiles.FindAsync(request.DoctorProfileId.Value);
            linkedProfile!.AppUserId = user.Id;
            linkedProfile.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Created,
            AuditEntityTypes.User,
            user.Id,
            user.Email,
            $"User created: {user.Email} ({user.Role})");

        return (ToDto(user, linkedProfile), null);
    }

    public async Task<(UserDto? User, string? Error)> UpdateAsync(Guid id, UpdateUserDto request)
    {
        var user = await _context.AppUsers.FindAsync(id);
        if (user is null)
        {
            return (null, null);
        }

        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role))
        {
            return (null, "Role is not a valid value.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailTaken = await _context.AppUsers
            .AnyAsync(u => u.Id != id && u.Email.ToLower() == normalizedEmail);
        if (emailTaken)
        {
            return (null, "A user with this email already exists.");
        }

        var wouldRemoveLastAdmin = user.Role == UserRole.Admin && user.IsActive
            && (role != UserRole.Admin || !request.IsActive)
            && await IsOnlyActiveAdminAsync(id);
        if (wouldRemoveLastAdmin)
        {
            return (null, "Cannot change the last active admin's role or status — the clinic must always have at least one active admin.");
        }

        var linkError = await ValidateDoctorProfileLinkAsync(request.DoctorProfileId, excludingUserId: id);
        if (linkError is not null)
        {
            return (null, linkError);
        }

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.Role = role;
        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var linkedProfile = await RelinkDoctorProfileAsync(id, request.DoctorProfileId);

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.User,
            user.Id,
            user.Email,
            $"User updated: {user.Email}");

        return (ToDto(user, linkedProfile), null);
    }

    public async Task<(UserDto? User, string? Error)> SetActiveStatusAsync(Guid id, bool isActive)
    {
        var user = await _context.AppUsers.FindAsync(id);
        if (user is null)
        {
            return (null, null);
        }

        if (!isActive && user.Role == UserRole.Admin && user.IsActive && await IsOnlyActiveAdminAsync(id))
        {
            return (null, "Cannot deactivate the last active admin — the clinic must always have at least one active admin.");
        }

        user.IsActive = isActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            isActive ? AuditActions.Activated : AuditActions.Deactivated,
            AuditEntityTypes.User,
            user.Id,
            user.Email,
            $"User {(isActive ? "activated" : "deactivated")}: {user.Email}");

        var profile = await _context.DoctorProfiles.SingleOrDefaultAsync(d => d.AppUserId == id);
        return (ToDto(user, profile), null);
    }

    public async Task<UserDto?> ResetPasswordAsync(Guid id, string newPassword)
    {
        var user = await _context.AppUsers.FindAsync(id);
        if (user is null)
        {
            return null;
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.User,
            user.Id,
            user.Email,
            $"Password reset for user: {user.Email}");

        var profile = await _context.DoctorProfiles.SingleOrDefaultAsync(d => d.AppUserId == id);
        return ToDto(user, profile);
    }

    /// <summary>True if this user is currently the clinic's only active admin.</summary>
    private async Task<bool> IsOnlyActiveAdminAsync(Guid userId)
    {
        var otherActiveAdmins = await _context.AppUsers
            .CountAsync(u => u.Id != userId && u.Role == UserRole.Admin && u.IsActive);
        return otherActiveAdmins == 0;
    }

    private async Task<string?> ValidateDoctorProfileLinkAsync(Guid? doctorProfileId, Guid? excludingUserId)
    {
        if (doctorProfileId is null)
        {
            return null;
        }

        var profile = await _context.DoctorProfiles.FindAsync(doctorProfileId.Value);
        if (profile is null)
        {
            return "DoctorProfileId does not reference an existing doctor profile.";
        }

        if (profile.AppUserId is not null && profile.AppUserId != excludingUserId)
        {
            return "This doctor profile is already linked to another user account.";
        }

        return null;
    }

    /// <summary>
    /// Unlinks any doctor profile currently pointing at this user that no longer
    /// matches the requested link, then links the requested profile (if any).
    /// Caller must have already validated the link via <see cref="ValidateDoctorProfileLinkAsync"/>.
    /// </summary>
    private async Task<DoctorProfile?> RelinkDoctorProfileAsync(Guid userId, Guid? doctorProfileId)
    {
        var currentlyLinked = await _context.DoctorProfiles.Where(d => d.AppUserId == userId).ToListAsync();
        foreach (var profile in currentlyLinked.Where(p => p.Id != doctorProfileId))
        {
            profile.AppUserId = null;
            profile.UpdatedAtUtc = DateTime.UtcNow;
        }

        if (doctorProfileId is null)
        {
            return null;
        }

        var target = currentlyLinked.FirstOrDefault(p => p.Id == doctorProfileId)
            ?? await _context.DoctorProfiles.FindAsync(doctorProfileId.Value);
        target!.AppUserId = userId;
        target.UpdatedAtUtc = DateTime.UtcNow;
        return target;
    }

    private async Task<Dictionary<Guid, DoctorProfile>> GetLinkedProfilesAsync(IEnumerable<Guid> userIds)
    {
        var ids = userIds.ToList();
        var profiles = await _context.DoctorProfiles
            .Where(d => d.AppUserId != null && ids.Contains(d.AppUserId.Value))
            .ToListAsync();
        return profiles.ToDictionary(p => p.AppUserId!.Value);
    }

    private static UserDto ToDto(AppUser user, DoctorProfile? profile) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        DoctorProfileId = profile?.Id,
        DoctorProfileName = profile?.FullName,
        CreatedAtUtc = user.CreatedAtUtc,
        UpdatedAtUtc = user.UpdatedAtUtc
    };
}
