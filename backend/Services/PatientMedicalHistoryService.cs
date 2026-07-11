using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class PatientMedicalHistoryService : IPatientMedicalHistoryService
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUser;

    public PatientMedicalHistoryService(
        AppDbContext context,
        IAuditLogService auditLogService,
        ICurrentUserService currentUser)
    {
        _context = context;
        _auditLogService = auditLogService;
        _currentUser = currentUser;
    }

    public async Task<PatientMedicalHistoryDto?> GetByPatientIdAsync(Guid patientId)
    {
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == patientId);
        if (!patientExists)
        {
            return null;
        }

        var history = await _context.PatientMedicalHistories
            .Include(h => h.LastUpdatedByUser)
            .FirstOrDefaultAsync(h => h.PatientId == patientId);

        return history is null ? EmptyDto(patientId) : ToDto(history);
    }

    public async Task<(PatientMedicalHistoryDto? History, string? Error)> UpsertAsync(
        Guid patientId, UpsertPatientMedicalHistoryDto request)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        if (patient is null)
        {
            return (null, null);
        }

        var history = await _context.PatientMedicalHistories
            .Include(h => h.LastUpdatedByUser)
            .FirstOrDefaultAsync(h => h.PatientId == patientId);

        var isNew = history is null;
        if (history is null)
        {
            history = new PatientMedicalHistory
            {
                Id = Guid.NewGuid(),
                PatientId = patientId,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.PatientMedicalHistories.Add(history);
        }

        history.Allergies = NormalizeOptional(request.Allergies);
        history.ChronicDiseases = NormalizeOptional(request.ChronicDiseases);
        history.CurrentMedications = NormalizeOptional(request.CurrentMedications);
        history.PreviousSurgeries = NormalizeOptional(request.PreviousSurgeries);
        history.PregnancyStatus = ParseEnumOrDefault<PregnancyStatus>(request.PregnancyStatus);
        history.SmokingStatus = ParseEnumOrDefault<SmokingStatus>(request.SmokingStatus);
        history.DiabetesStatus = ParseEnumOrDefault<DiabetesStatus>(request.DiabetesStatus);
        history.BloodPressureNotes = NormalizeOptional(request.BloodPressureNotes);
        history.HeartDisease = request.HeartDisease;
        history.BloodThinners = request.BloodThinners;
        history.AnesthesiaSensitivity = request.AnesthesiaSensitivity;
        history.MedicalAlerts = NormalizeOptional(request.MedicalAlerts);
        history.EmergencyContactName = NormalizeOptional(request.EmergencyContactName);
        history.EmergencyContactPhone = NormalizeOptional(request.EmergencyContactPhone);
        history.LastUpdatedAtUtc = DateTime.UtcNow;
        history.LastUpdatedByUserId = _currentUser.UserId;

        await _context.SaveChangesAsync();

        // Privacy: the audit summary must never contain medical text — only
        // the patient's name, which already appears in other audit entries.
        var fullName = $"{patient.FirstName} {patient.LastName}";
        await _auditLogService.LogAsync(
            isNew ? AuditActions.Created : AuditActions.Updated,
            AuditEntityTypes.PatientMedicalHistory,
            history.Id,
            fullName,
            $"Medical history {(isNew ? "created" : "updated")} for patient: {fullName}");

        // Reload the updater so LastUpdatedByUserName reflects this request.
        await _context.Entry(history).Reference(h => h.LastUpdatedByUser).LoadAsync();

        return (ToDto(history), null);
    }

    private static TEnum ParseEnumOrDefault<TEnum>(string? value) where TEnum : struct, Enum =>
        Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) ? parsed : default;

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static PatientMedicalHistoryDto EmptyDto(Guid patientId) => new()
    {
        PatientId = patientId,
        PregnancyStatus = PregnancyStatus.Unknown.ToString(),
        SmokingStatus = SmokingStatus.Unknown.ToString(),
        DiabetesStatus = DiabetesStatus.Unknown.ToString(),
        HeartDisease = false,
        BloodThinners = false,
        AnesthesiaSensitivity = false
    };

    private static PatientMedicalHistoryDto ToDto(PatientMedicalHistory history) => new()
    {
        PatientId = history.PatientId,
        Allergies = history.Allergies,
        ChronicDiseases = history.ChronicDiseases,
        CurrentMedications = history.CurrentMedications,
        PreviousSurgeries = history.PreviousSurgeries,
        PregnancyStatus = history.PregnancyStatus.ToString(),
        SmokingStatus = history.SmokingStatus.ToString(),
        DiabetesStatus = history.DiabetesStatus.ToString(),
        BloodPressureNotes = history.BloodPressureNotes,
        HeartDisease = history.HeartDisease,
        BloodThinners = history.BloodThinners,
        AnesthesiaSensitivity = history.AnesthesiaSensitivity,
        MedicalAlerts = history.MedicalAlerts,
        EmergencyContactName = history.EmergencyContactName,
        EmergencyContactPhone = history.EmergencyContactPhone,
        LastUpdatedAtUtc = history.LastUpdatedAtUtc,
        LastUpdatedByUserName = history.LastUpdatedByUser?.FullName
    };
}
