using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Auth;
using ClinicFlow.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IAuditLogService _auditLogService;

    public AuthService(
        AppDbContext context,
        IPasswordHasher<AppUser> passwordHasher,
        IJwtTokenService jwtTokenService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _auditLogService = auditLogService;
    }

    public async Task<LoginResponseDto?> LoginAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await _context.AppUsers
            .SingleOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user is null || !user.IsActive)
        {
            await LogLoginFailedAsync(normalizedEmail);
            return null;
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            await LogLoginFailedAsync(normalizedEmail);
            return null;
        }

        var token = _jwtTokenService.GenerateToken(user);

        await _auditLogService.LogAsync(
            AuditActions.LoginSucceeded,
            AuditEntityTypes.Auth,
            entityId: user.Id,
            entityDisplayName: user.Email,
            summary: $"User logged in: {user.Email}",
            userIdOverride: user.Id,
            userEmailOverride: user.Email,
            userFullNameOverride: user.FullName,
            userRoleOverride: user.Role.ToString());

        return new LoginResponseDto
        {
            Token = token,
            User = ToDto(user)
        };
    }

    private Task LogLoginFailedAsync(string attemptedEmail) =>
        _auditLogService.LogAsync(
            AuditActions.LoginFailed,
            AuditEntityTypes.Auth,
            entityId: null,
            entityDisplayName: attemptedEmail,
            summary: $"Failed login attempt for {attemptedEmail}",
            userEmailOverride: attemptedEmail);

    public async Task<AuthUserDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _context.AppUsers.FindAsync(userId);
        return user is null || !user.IsActive ? null : ToDto(user);
    }

    private static AuthUserDto ToDto(AppUser user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role.ToString()
    };
}
