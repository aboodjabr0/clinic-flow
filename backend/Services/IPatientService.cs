using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Patients;

namespace ClinicFlow.Api.Services;

public interface IPatientService
{
    Task<(PaginatedResponse<PatientListItemDto>? Result, string? Error)> GetPatientsAsync(PatientQueryDto query);
    Task<PatientDto?> GetPatientByIdAsync(Guid id);
    Task<(PatientDto? Patient, string? Error)> CreatePatientAsync(CreatePatientDto request);
    Task<(PatientDto? Patient, string? Error)> UpdatePatientAsync(Guid id, UpdatePatientDto request);
    Task<PatientDto?> SetPatientActiveStatusAsync(Guid id, bool isActive);
    Task<PatientStatsDto> GetPatientStatsAsync();
}
