using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Doctors;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class DoctorService : IDoctorService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public DoctorService(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<List<DoctorDto>> GetAllAsync()
    {
        return await _context.DoctorProfiles
            .OrderBy(d => d.FullName)
            .Select(d => ToDto(d))
            .ToListAsync();
    }

    public async Task<DoctorDto?> GetByIdAsync(Guid id)
    {
        var doctor = await _context.DoctorProfiles.FindAsync(id);
        return doctor is null ? null : ToDto(doctor);
    }

    public async Task<(DoctorDto? Doctor, string? Error)> CreateAsync(CreateDoctorDto request)
    {
        var linkError = await ValidateAppUserLinkAsync(request.AppUserId, excludingDoctorId: null);
        if (linkError is not null)
        {
            return (null, linkError);
        }

        var doctor = new DoctorProfile
        {
            Id = Guid.NewGuid(),
            AppUserId = request.AppUserId,
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Specialty = request.Specialty.Trim(),
            LicenseNumber = request.LicenseNumber?.Trim(),
            Bio = request.Bio?.Trim(),
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.DoctorProfiles.Add(doctor);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Created,
            AuditEntityTypes.DoctorProfile,
            doctor.Id,
            doctor.FullName,
            $"Doctor created: {doctor.FullName}");

        return (ToDto(doctor), null);
    }

    public async Task<(DoctorDto? Doctor, string? Error)> UpdateAsync(Guid id, UpdateDoctorDto request)
    {
        var doctor = await _context.DoctorProfiles.FindAsync(id);
        if (doctor is null)
        {
            return (null, null);
        }

        var linkError = await ValidateAppUserLinkAsync(request.AppUserId, excludingDoctorId: id);
        if (linkError is not null)
        {
            return (null, linkError);
        }

        doctor.AppUserId = request.AppUserId;
        doctor.FullName = request.FullName.Trim();
        doctor.Email = request.Email.Trim();
        doctor.PhoneNumber = request.PhoneNumber?.Trim();
        doctor.Specialty = request.Specialty.Trim();
        doctor.LicenseNumber = request.LicenseNumber?.Trim();
        doctor.Bio = request.Bio?.Trim();
        doctor.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.DoctorProfile,
            doctor.Id,
            doctor.FullName,
            $"Doctor updated: {doctor.FullName}");

        return (ToDto(doctor), null);
    }

    public async Task<DoctorDto?> SetActiveStatusAsync(Guid id, bool isActive)
    {
        var doctor = await _context.DoctorProfiles.FindAsync(id);
        if (doctor is null)
        {
            return null;
        }

        doctor.IsActive = isActive;
        doctor.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            isActive ? AuditActions.Activated : AuditActions.Deactivated,
            AuditEntityTypes.DoctorProfile,
            doctor.Id,
            doctor.FullName,
            $"Doctor {(isActive ? "activated" : "deactivated")}: {doctor.FullName}");

        return ToDto(doctor);
    }

    private async Task<string?> ValidateAppUserLinkAsync(Guid? appUserId, Guid? excludingDoctorId)
    {
        if (appUserId is null)
        {
            return null;
        }

        var appUserExists = await _context.AppUsers.AnyAsync(u => u.Id == appUserId);
        if (!appUserExists)
        {
            return "AppUserId does not reference an existing account.";
        }

        var alreadyLinked = await _context.DoctorProfiles
            .AnyAsync(d => d.AppUserId == appUserId && d.Id != excludingDoctorId);
        if (alreadyLinked)
        {
            return "This account is already linked to another doctor profile.";
        }

        return null;
    }

    private static DoctorDto ToDto(DoctorProfile doctor) => new()
    {
        Id = doctor.Id,
        AppUserId = doctor.AppUserId,
        FullName = doctor.FullName,
        Email = doctor.Email,
        PhoneNumber = doctor.PhoneNumber,
        Specialty = doctor.Specialty,
        LicenseNumber = doctor.LicenseNumber,
        Bio = doctor.Bio,
        IsActive = doctor.IsActive,
        CreatedAtUtc = doctor.CreatedAtUtc,
        UpdatedAtUtc = doctor.UpdatedAtUtc
    };
}
