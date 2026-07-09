namespace ClinicFlow.Api.DTOs.Auth;

/// <summary>
/// Safe, public-facing user projection. Never include PasswordHash here.
/// </summary>
public class AuthUserDto
{
    public required Guid Id { get; init; }
    public required string FullName { get; init; }
    public required string Email { get; init; }
    public required string Role { get; init; }
}
