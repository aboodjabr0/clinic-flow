using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Users;

public class ResetPasswordDto
{
    [Required, MinLength(8), MaxLength(200)]
    public required string NewPassword { get; init; }
}
