using ClinicFlow.Api.DTOs.Clinic;

namespace ClinicFlow.Api.Services;

public interface IClinicSettingsService
{
    Task<ClinicSettingsDto> GetAsync();
    Task<(ClinicSettingsDto? Settings, string? Error)> UpdateAsync(UpdateClinicSettingsDto request);
}
