using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Doctors;

public class CreateDoctorDto
{
    [Required, StringLength(200)]
    public required string FullName { get; init; }

    [Required, EmailAddress, StringLength(256)]
    public required string Email { get; init; }

    [StringLength(30)]
    public string? PhoneNumber { get; init; }

    [Required, StringLength(150)]
    public required string Specialty { get; init; }

    [StringLength(100)]
    public string? LicenseNumber { get; init; }

    [StringLength(2000)]
    public string? Bio { get; init; }

    /// <summary>Optional link to an existing login account with Role = Doctor.</summary>
    public Guid? AppUserId { get; init; }
}
