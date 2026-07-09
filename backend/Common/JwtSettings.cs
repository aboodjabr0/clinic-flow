namespace ClinicFlow.Api.Common;

/// <summary>
/// Bound from the "Jwt" configuration section (Jwt__Issuer, Jwt__Audience,
/// Jwt__ExpiresMinutes). Jwt__Key is resolved separately in Program.cs since
/// it must never have a committed value in appsettings.
/// </summary>
public class JwtSettings
{
    public string Issuer { get; init; } = "ClinicFlow.Api";
    public string Audience { get; init; } = "ClinicFlow.Client";
    public int ExpiresMinutes { get; init; } = 60;
}
