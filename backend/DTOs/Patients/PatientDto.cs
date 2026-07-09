namespace ClinicFlow.Api.DTOs.Patients;

public class PatientDto
{
    public required Guid Id { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string FullName { get; init; }
    public required string PhoneNumber { get; init; }
    public string? Email { get; init; }
    public required string Gender { get; init; }
    public DateOnly? DateOfBirth { get; init; }
    public string? Address { get; init; }
    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }
    public string? MedicalNotes { get; init; }
    public string? Allergies { get; init; }
    public required bool IsActive { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
