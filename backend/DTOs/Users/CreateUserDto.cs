using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Users;

public class CreateUserDto
{
    [Required, StringLength(200)]
    public required string FullName { get; init; }

    [Required, EmailAddress, StringLength(256)]
    public required string Email { get; init; }

    [Required, MinLength(8), MaxLength(200)]
    public required string Password { get; init; }

    [Required, EnumDataType(typeof(Entities.UserRole))]
    public required string Role { get; init; }

    /// <summary>Optional link to an existing, currently-unlinked doctor profile.</summary>
    public Guid? DoctorProfileId { get; init; }

    public bool IsActive { get; init; } = true;
}
