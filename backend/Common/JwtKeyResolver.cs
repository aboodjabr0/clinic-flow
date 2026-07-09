namespace ClinicFlow.Api.Common;

/// <summary>
/// Resolves the JWT signing key from Jwt__Key. Shared by JwtTokenService
/// (signing) and Program.cs (validation) so both always agree on the key.
/// </summary>
public static class JwtKeyResolver
{
    /// <summary>
    /// Dev-only fallback signing key, used only when ASPNETCORE_ENVIRONMENT
    /// is Development and Jwt__Key is not set. Never use in production —
    /// set the Jwt__Key environment variable instead.
    /// </summary>
    private const string DevOnlyFallbackKey = "dev-only-insecure-jwt-signing-key-do-not-use-in-production-env";

    public static string Resolve(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var key = configuration["Jwt:Key"];
        if (!string.IsNullOrWhiteSpace(key))
        {
            return key;
        }

        if (environment.IsDevelopment())
        {
            return DevOnlyFallbackKey;
        }

        throw new InvalidOperationException(
            "Jwt:Key is not configured. Set the Jwt__Key environment variable.");
    }
}
