using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Auth;

public class LoginRequestDto
{
    [Required, EmailAddress, MaxLength(256)]
    public required string Email { get; init; }

    [Required, MaxLength(200)]
    public required string Password { get; init; }
}
