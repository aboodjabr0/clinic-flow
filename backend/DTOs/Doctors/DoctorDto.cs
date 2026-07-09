namespace ClinicFlow.Api.DTOs.Doctors;

public class DoctorDto
{
    public required Guid Id { get; init; }
    public Guid? AppUserId { get; init; }
    public required string FullName { get; init; }
    public required string Email { get; init; }
    public string? PhoneNumber { get; init; }
    public required string Specialty { get; init; }
    public string? LicenseNumber { get; init; }
    public string? Bio { get; init; }
    public required bool IsActive { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
