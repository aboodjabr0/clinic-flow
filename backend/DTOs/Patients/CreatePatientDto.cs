using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Patients;

public class CreatePatientDto
{
    [Required, StringLength(100)]
    public required string FirstName { get; init; }

    [Required, StringLength(100)]
    public required string LastName { get; init; }

    [Required, StringLength(30)]
    public required string PhoneNumber { get; init; }

    [EmailAddress, StringLength(256)]
    public string? Email { get; init; }

    [Required, EnumDataType(typeof(Entities.PatientGender))]
    public required string Gender { get; init; }

    public DateOnly? DateOfBirth { get; init; }

    [StringLength(300)]
    public string? Address { get; init; }

    [StringLength(200)]
    public string? EmergencyContactName { get; init; }

    [StringLength(30)]
    public string? EmergencyContactPhone { get; init; }

    [StringLength(2000)]
    public string? MedicalNotes { get; init; }

    [StringLength(1000)]
    public string? Allergies { get; init; }
}
