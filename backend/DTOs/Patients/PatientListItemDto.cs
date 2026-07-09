namespace ClinicFlow.Api.DTOs.Patients;

/// <summary>Lightweight projection for the patients table/list — omits medical text fields.</summary>
public class PatientListItemDto
{
    public required Guid Id { get; init; }
    public required string FullName { get; init; }
    public required string PhoneNumber { get; init; }
    public string? Email { get; init; }
    public required string Gender { get; init; }
    public DateOnly? DateOfBirth { get; init; }
    public required bool IsActive { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
}
