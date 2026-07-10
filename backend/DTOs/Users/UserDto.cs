namespace ClinicFlow.Api.DTOs.Users;

public class UserDto
{
    public required Guid Id { get; init; }
    public required string FullName { get; init; }
    public required string Email { get; init; }
    public required string Role { get; init; }
    public required bool IsActive { get; init; }
    public Guid? DoctorProfileId { get; init; }
    public string? DoctorProfileName { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
