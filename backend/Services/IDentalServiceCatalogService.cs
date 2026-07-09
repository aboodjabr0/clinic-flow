using ClinicFlow.Api.DTOs.DentalServices;

namespace ClinicFlow.Api.Services;

public interface IDentalServiceCatalogService
{
    Task<List<DentalServiceDto>> GetAllAsync();
    Task<DentalServiceDto?> GetByIdAsync(Guid id);
    Task<(DentalServiceDto? Service, string? Error)> CreateAsync(CreateDentalServiceDto request);
    Task<(DentalServiceDto? Service, string? Error)> UpdateAsync(Guid id, UpdateDentalServiceDto request);
    Task<DentalServiceDto?> SetActiveStatusAsync(Guid id, bool isActive);
}
