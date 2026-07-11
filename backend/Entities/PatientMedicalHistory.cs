namespace ClinicFlow.Api.Entities;

/// <summary>
/// Structured pre-treatment medical history for a patient — one record per
/// patient, upserted as a whole. Free-text fields hold notes written by staff;
/// enums/booleans are machine-readable risk flags. No diagnosis logic here:
/// this is intake information dentists review before treatment.
/// </summary>
public class PatientMedicalHistory
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }

    public string? Allergies { get; set; }
    public string? ChronicDiseases { get; set; }
    public string? CurrentMedications { get; set; }
    public string? PreviousSurgeries { get; set; }

    public PregnancyStatus PregnancyStatus { get; set; } = PregnancyStatus.Unknown;
    public SmokingStatus SmokingStatus { get; set; } = SmokingStatus.Unknown;
    public DiabetesStatus DiabetesStatus { get; set; } = DiabetesStatus.Unknown;

    public string? BloodPressureNotes { get; set; }
    public bool HeartDisease { get; set; }
    public bool BloodThinners { get; set; }
    public bool AnesthesiaSensitivity { get; set; }
    public string? MedicalAlerts { get; set; }

    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime LastUpdatedAtUtc { get; set; }
    public Guid? LastUpdatedByUserId { get; set; }
    public AppUser? LastUpdatedByUser { get; set; }
}
