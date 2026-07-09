using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.DentalServices;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class DentalServiceCatalogService : IDentalServiceCatalogService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public DentalServiceCatalogService(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<List<DentalServiceDto>> GetAllAsync()
    {
        return await _context.DentalServices
            .OrderBy(s => s.Name)
            .Select(s => ToDto(s))
            .ToListAsync();
    }

    public async Task<DentalServiceDto?> GetByIdAsync(Guid id)
    {
        var service = await _context.DentalServices.FindAsync(id);
        return service is null ? null : ToDto(service);
    }

    public async Task<(DentalServiceDto? Service, string? Error)> CreateAsync(CreateDentalServiceDto request)
    {
        var nameTaken = await _context.DentalServices.AnyAsync(s => s.Name == request.Name.Trim());
        if (nameTaken)
        {
            return (null, "A dental service with this name already exists.");
        }

        var service = new DentalService
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            DefaultPrice = request.DefaultPrice,
            DurationMinutes = request.DurationMinutes,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.DentalServices.Add(service);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Created,
            AuditEntityTypes.DentalService,
            service.Id,
            service.Name,
            $"Dental service created: {service.Name}");

        return (ToDto(service), null);
    }

    public async Task<(DentalServiceDto? Service, string? Error)> UpdateAsync(Guid id, UpdateDentalServiceDto request)
    {
        var service = await _context.DentalServices.FindAsync(id);
        if (service is null)
        {
            return (null, null);
        }

        var trimmedName = request.Name.Trim();
        var nameTaken = await _context.DentalServices.AnyAsync(s => s.Name == trimmedName && s.Id != id);
        if (nameTaken)
        {
            return (null, "A dental service with this name already exists.");
        }

        service.Name = trimmedName;
        service.Description = request.Description?.Trim();
        service.DefaultPrice = request.DefaultPrice;
        service.DurationMinutes = request.DurationMinutes;
        service.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.DentalService,
            service.Id,
            service.Name,
            $"Dental service updated: {service.Name}");

        return (ToDto(service), null);
    }

    public async Task<DentalServiceDto?> SetActiveStatusAsync(Guid id, bool isActive)
    {
        var service = await _context.DentalServices.FindAsync(id);
        if (service is null)
        {
            return null;
        }

        service.IsActive = isActive;
        service.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            isActive ? AuditActions.Activated : AuditActions.Deactivated,
            AuditEntityTypes.DentalService,
            service.Id,
            service.Name,
            $"Dental service {(isActive ? "activated" : "deactivated")}: {service.Name}");

        return ToDto(service);
    }

    private static DentalServiceDto ToDto(DentalService service) => new()
    {
        Id = service.Id,
        Name = service.Name,
        Description = service.Description,
        DefaultPrice = service.DefaultPrice,
        DurationMinutes = service.DurationMinutes,
        IsActive = service.IsActive,
        CreatedAtUtc = service.CreatedAtUtc,
        UpdatedAtUtc = service.UpdatedAtUtc
    };
}
