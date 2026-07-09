using System.Globalization;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Clinic;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class ClinicSettingsService : IClinicSettingsService
{
    private const string TimeFormat = "HH:mm";

    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public ClinicSettingsService(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<ClinicSettingsDto> GetAsync()
    {
        var settings = await GetOrCreateSettingsRowAsync();
        return ToDto(settings);
    }

    public async Task<(ClinicSettingsDto? Settings, string? Error)> UpdateAsync(UpdateClinicSettingsDto request)
    {
        if (!TryParseTime(request.OpeningTime, out var openingTime))
        {
            return (null, "Opening time must be in HH:mm format.");
        }

        if (!TryParseTime(request.ClosingTime, out var closingTime))
        {
            return (null, "Closing time must be in HH:mm format.");
        }

        var settings = await GetOrCreateSettingsRowAsync();

        settings.ClinicName = request.ClinicName.Trim();
        settings.PhoneNumber = request.PhoneNumber?.Trim();
        settings.Email = request.Email?.Trim();
        settings.Address = request.Address?.Trim();
        settings.OpeningTime = openingTime;
        settings.ClosingTime = closingTime;
        settings.DefaultCurrency = request.DefaultCurrency.Trim();
        settings.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.SettingsUpdated,
            AuditEntityTypes.ClinicSettings,
            settings.Id,
            settings.ClinicName,
            "Clinic settings updated");

        return (ToDto(settings), null);
    }

    private async Task<Entities.ClinicSettings> GetOrCreateSettingsRowAsync()
    {
        var settings = await _context.ClinicSettings.FirstOrDefaultAsync();
        if (settings is not null)
        {
            return settings;
        }

        settings = new Entities.ClinicSettings
        {
            Id = Guid.NewGuid(),
            ClinicName = "ClinicFlow Dental Clinic",
            DefaultCurrency = "JOD",
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ClinicSettings.Add(settings);
        await _context.SaveChangesAsync();

        return settings;
    }

    private static bool TryParseTime(string? value, out TimeOnly? result)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            result = null;
            return true;
        }

        if (TimeOnly.TryParseExact(value, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            result = parsed;
            return true;
        }

        result = null;
        return false;
    }

    private static ClinicSettingsDto ToDto(Entities.ClinicSettings settings) => new()
    {
        Id = settings.Id,
        ClinicName = settings.ClinicName,
        PhoneNumber = settings.PhoneNumber,
        Email = settings.Email,
        Address = settings.Address,
        OpeningTime = settings.OpeningTime?.ToString(TimeFormat, CultureInfo.InvariantCulture),
        ClosingTime = settings.ClosingTime?.ToString(TimeFormat, CultureInfo.InvariantCulture),
        DefaultCurrency = settings.DefaultCurrency,
        CreatedAtUtc = settings.CreatedAtUtc,
        UpdatedAtUtc = settings.UpdatedAtUtc
    };
}
