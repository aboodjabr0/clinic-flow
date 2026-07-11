using ClinicFlow.Api.DTOs.Patients;

namespace ClinicFlow.Api.Services;

public interface IPatientMedicalHistoryService
{
    /// <summary>
    /// Returns the patient's medical history, or an empty default DTO when no
    /// record has been created yet. Null means the patient does not exist.
    /// </summary>
    Task<PatientMedicalHistoryDto?> GetByPatientIdAsync(Guid patientId);

    /// <summary>
    /// Creates or updates the patient's medical history. Null DTO with null
    /// error means the patient does not exist.
    /// </summary>
    Task<(PatientMedicalHistoryDto? History, string? Error)> UpsertAsync(Guid patientId, UpsertPatientMedicalHistoryDto request);
}
