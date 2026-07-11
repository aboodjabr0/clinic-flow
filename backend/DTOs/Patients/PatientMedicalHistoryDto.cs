namespace ClinicFlow.Api.DTOs.Patients;

/// <summary>
/// Medical history for a patient. When no record exists yet the API returns
/// this DTO with defaults and a null <see cref="LastUpdatedAtUtc"/>, so the
/// frontend can render an empty editable form without a 404 special case.
/// </summary>
public class PatientMedicalHistoryDto
{
    public required Guid PatientId { get; init; }

    public string? Allergies { get; init; }
    public string? ChronicDiseases { get; init; }
    public string? CurrentMedications { get; init; }
    public string? PreviousSurgeries { get; init; }

    public required string PregnancyStatus { get; init; }
    public required string SmokingStatus { get; init; }
    public required string DiabetesStatus { get; init; }

    public string? BloodPressureNotes { get; init; }
    public required bool HeartDisease { get; init; }
    public required bool BloodThinners { get; init; }
    public required bool AnesthesiaSensitivity { get; init; }
    public string? MedicalAlerts { get; init; }

    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }

    public DateTime? LastUpdatedAtUtc { get; init; }
    public string? LastUpdatedByUserName { get; init; }
}
