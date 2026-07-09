namespace ClinicFlow.Api.DTOs.Auth;

public class LoginResponseDto
{
    public required string Token { get; init; }
    public required AuthUserDto User { get; init; }
}
