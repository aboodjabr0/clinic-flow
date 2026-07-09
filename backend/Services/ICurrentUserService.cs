namespace ClinicFlow.Api.Services;

/// <summary>
/// Reads the current request's authenticated user (from JWT claims) and
/// connection info (IP/User-Agent). IP/User-Agent are available even when
/// there is no authenticated principal, which is what lets audit logging
/// record failed login attempts.
/// </summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    string? FullName { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
}
