using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Patients;

public class UpsertPatientMedicalHistoryDto
{
    [StringLength(1000)]
    public string? Allergies { get; init; }

    [StringLength(1000)]
    public string? ChronicDiseases { get; init; }

    [StringLength(1000)]
    public string? CurrentMedications { get; init; }

    [StringLength(1000)]
    public string? PreviousSurgeries { get; init; }

    [EnumDataType(typeof(Entities.PregnancyStatus))]
    public string? PregnancyStatus { get; init; }

    [EnumDataType(typeof(Entities.SmokingStatus))]
    public string? SmokingStatus { get; init; }

    [EnumDataType(typeof(Entities.DiabetesStatus))]
    public string? DiabetesStatus { get; init; }

    [StringLength(500)]
    public string? BloodPressureNotes { get; init; }

    public bool HeartDisease { get; init; }
    public bool BloodThinners { get; init; }
    public bool AnesthesiaSensitivity { get; init; }

    [StringLength(1000)]
    public string? MedicalAlerts { get; init; }

    [StringLength(200)]
    public string? EmergencyContactName { get; init; }

    [StringLength(30)]
    public string? EmergencyContactPhone { get; init; }
}
