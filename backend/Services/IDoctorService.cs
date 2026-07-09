using ClinicFlow.Api.DTOs.Doctors;

namespace ClinicFlow.Api.Services;

public interface IDoctorService
{
    Task<List<DoctorDto>> GetAllAsync();
    Task<DoctorDto?> GetByIdAsync(Guid id);
    Task<(DoctorDto? Doctor, string? Error)> CreateAsync(CreateDoctorDto request);
    Task<(DoctorDto? Doctor, string? Error)> UpdateAsync(Guid id, UpdateDoctorDto request);
    Task<DoctorDto?> SetActiveStatusAsync(Guid id, bool isActive);
}
