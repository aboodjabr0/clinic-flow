using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class PatientService : IPatientService
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public PatientService(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<(PaginatedResponse<PatientListItemDto>? Result, string? Error)> GetPatientsAsync(PatientQueryDto query)
    {
        PatientGender? genderFilter = null;
        if (!string.IsNullOrWhiteSpace(query.Gender))
        {
            if (!Enum.TryParse<PatientGender>(query.Gender, ignoreCase: true, out var parsedGender))
            {
                return (null, "Invalid gender filter.");
            }
            genderFilter = parsedGender;
        }

        var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize < 1 ? 10 : Math.Min(query.PageSize, MaxPageSize);

        var patients = _context.Patients.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            patients = patients.Where(p =>
                p.FirstName.ToLower().Contains(search) ||
                p.LastName.ToLower().Contains(search) ||
                (p.FirstName + " " + p.LastName).ToLower().Contains(search) ||
                p.PhoneNumber.ToLower().Contains(search) ||
                (p.Email != null && p.Email.ToLower().Contains(search)));
        }

        if (query.IsActive.HasValue)
        {
            patients = patients.Where(p => p.IsActive == query.IsActive.Value);
        }

        if (genderFilter.HasValue)
        {
            patients = patients.Where(p => p.Gender == genderFilter.Value);
        }

        var totalCount = await patients.CountAsync();

        var items = await patients
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => ToListItemDto(p))
            .ToListAsync();

        var result = new PaginatedResponse<PatientListItemDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return (result, null);
    }

    public async Task<PatientDto?> GetPatientByIdAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id);
        return patient is null ? null : ToDto(patient);
    }

    public async Task<(PatientDto? Patient, string? Error)> CreatePatientAsync(CreatePatientDto request)
    {
        var (gender, dobError) = ValidateRequest(request.Gender, request.DateOfBirth);
        if (dobError is not null)
        {
            return (null, dobError);
        }

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = NormalizeOptional(request.Email),
            Gender = gender!.Value,
            DateOfBirth = request.DateOfBirth,
            Address = NormalizeOptional(request.Address),
            EmergencyContactName = NormalizeOptional(request.EmergencyContactName),
            EmergencyContactPhone = NormalizeOptional(request.EmergencyContactPhone),
            MedicalNotes = NormalizeOptional(request.MedicalNotes),
            Allergies = NormalizeOptional(request.Allergies),
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        var fullName = $"{patient.FirstName} {patient.LastName}";
        await _auditLogService.LogAsync(
            AuditActions.Created,
            AuditEntityTypes.Patient,
            patient.Id,
            fullName,
            $"Patient created: {fullName}");

        return (ToDto(patient), null);
    }

    public async Task<(PatientDto? Patient, string? Error)> UpdatePatientAsync(Guid id, UpdatePatientDto request)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient is null)
        {
            return (null, null);
        }

        var (gender, dobError) = ValidateRequest(request.Gender, request.DateOfBirth);
        if (dobError is not null)
        {
            return (null, dobError);
        }

        patient.FirstName = request.FirstName.Trim();
        patient.LastName = request.LastName.Trim();
        patient.PhoneNumber = request.PhoneNumber.Trim();
        patient.Email = NormalizeOptional(request.Email);
        patient.Gender = gender!.Value;
        patient.DateOfBirth = request.DateOfBirth;
        patient.Address = NormalizeOptional(request.Address);
        patient.EmergencyContactName = NormalizeOptional(request.EmergencyContactName);
        patient.EmergencyContactPhone = NormalizeOptional(request.EmergencyContactPhone);
        patient.MedicalNotes = NormalizeOptional(request.MedicalNotes);
        patient.Allergies = NormalizeOptional(request.Allergies);
        patient.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updatedFullName = $"{patient.FirstName} {patient.LastName}";
        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.Patient,
            patient.Id,
            updatedFullName,
            $"Patient updated: {updatedFullName}");

        return (ToDto(patient), null);
    }

    public async Task<PatientDto?> SetPatientActiveStatusAsync(Guid id, bool isActive)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient is null)
        {
            return null;
        }

        patient.IsActive = isActive;
        patient.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var fullName = $"{patient.FirstName} {patient.LastName}";
        await _auditLogService.LogAsync(
            isActive ? AuditActions.Activated : AuditActions.Deactivated,
            AuditEntityTypes.Patient,
            patient.Id,
            fullName,
            $"Patient {(isActive ? "activated" : "deactivated")}: {fullName}");

        return ToDto(patient);
    }

    public async Task<PatientStatsDto> GetPatientStatsAsync()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalPatients = await _context.Patients.CountAsync();
        var activePatients = await _context.Patients.CountAsync(p => p.IsActive);
        var newPatientsThisMonth = await _context.Patients.CountAsync(p => p.CreatedAtUtc >= startOfMonth);

        return new PatientStatsDto
        {
            TotalPatients = totalPatients,
            ActivePatients = activePatients,
            InactivePatients = totalPatients - activePatients,
            NewPatientsThisMonth = newPatientsThisMonth
        };
    }

    private static (PatientGender? Gender, string? Error) ValidateRequest(string gender, DateOnly? dateOfBirth)
    {
        if (!Enum.TryParse<PatientGender>(gender, ignoreCase: true, out var parsedGender))
        {
            return (null, "Invalid gender.");
        }

        if (dateOfBirth.HasValue && dateOfBirth.Value > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return (null, "Date of birth cannot be in the future.");
        }

        return (parsedGender, null);
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static PatientDto ToDto(Patient patient) => new()
    {
        Id = patient.Id,
        FirstName = patient.FirstName,
        LastName = patient.LastName,
        FullName = $"{patient.FirstName} {patient.LastName}",
        PhoneNumber = patient.PhoneNumber,
        Email = patient.Email,
        Gender = patient.Gender.ToString(),
        DateOfBirth = patient.DateOfBirth,
        Address = patient.Address,
        EmergencyContactName = patient.EmergencyContactName,
        EmergencyContactPhone = patient.EmergencyContactPhone,
        MedicalNotes = patient.MedicalNotes,
        Allergies = patient.Allergies,
        IsActive = patient.IsActive,
        CreatedAtUtc = patient.CreatedAtUtc,
        UpdatedAtUtc = patient.UpdatedAtUtc
    };

    private static PatientListItemDto ToListItemDto(Patient patient) => new()
    {
        Id = patient.Id,
        FullName = patient.FirstName + " " + patient.LastName,
        PhoneNumber = patient.PhoneNumber,
        Email = patient.Email,
        Gender = patient.Gender.ToString(),
        DateOfBirth = patient.DateOfBirth,
        IsActive = patient.IsActive,
        CreatedAtUtc = patient.CreatedAtUtc
    };
}
