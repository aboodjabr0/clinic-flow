using System.Globalization;
using System.Linq.Expressions;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Visits;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class VisitService : IVisitService
{
    private const int MaxPageSize = 100;
    private const string TimeFormat = "HH:mm";

    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public VisitService(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Flat, server-translatable projection carrying display data pulled in
    /// via joins to Appointment/Patient/DoctorProfile/DentalService. Mirrors
    /// the AppointmentRow pattern in AppointmentService.
    /// </summary>
    private record VisitRow(
        Guid Id,
        Guid AppointmentId,
        DateOnly AppointmentDate,
        TimeOnly AppointmentStartTime,
        TimeOnly AppointmentEndTime,
        Guid PatientId,
        string PatientFullName,
        string PatientPhoneNumber,
        Guid DoctorProfileId,
        string DoctorFullName,
        string ServiceName,
        DateOnly VisitDate,
        VisitStatus Status,
        string? ChiefComplaint,
        string? DiagnosisNote,
        string? TreatmentNote,
        string? ToothNumbers,
        string? PrescriptionNote,
        DateOnly? FollowUpDate,
        string? InternalNotes,
        DateTime? StartedAtUtc,
        DateTime? CompletedAtUtc,
        DateTime CreatedAtUtc,
        DateTime? UpdatedAtUtc);

    private static readonly Expression<Func<Visit, VisitRow>> ProjectToRow = v => new VisitRow(
        v.Id,
        v.AppointmentId,
        v.Appointment!.AppointmentDate,
        v.Appointment.StartTime,
        v.Appointment.EndTime,
        v.PatientId,
        v.Patient!.FirstName + " " + v.Patient.LastName,
        v.Patient.PhoneNumber,
        v.DoctorProfileId,
        v.DoctorProfile!.FullName,
        v.Appointment.DentalService!.Name,
        v.VisitDate,
        v.Status,
        v.ChiefComplaint,
        v.DiagnosisNote,
        v.TreatmentNote,
        v.ToothNumbers,
        v.PrescriptionNote,
        v.FollowUpDate,
        v.InternalNotes,
        v.StartedAtUtc,
        v.CompletedAtUtc,
        v.CreatedAtUtc,
        v.UpdatedAtUtc);

    public async Task<(PaginatedResponse<VisitListItemDto>? Result, string? Error)> GetVisitsAsync(VisitQueryDto query)
    {
        VisitStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<VisitStatus>(query.Status, ignoreCase: true, out var parsedStatus))
            {
                return (null, "Invalid status filter.");
            }
            statusFilter = parsedStatus;
        }

        var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize < 1 ? 10 : Math.Min(query.PageSize, MaxPageSize);

        var visits = _context.Visits.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            visits = visits.Where(v =>
                (v.Patient!.FirstName + " " + v.Patient.LastName).ToLower().Contains(search) ||
                v.Patient.PhoneNumber.ToLower().Contains(search) ||
                v.DoctorProfile!.FullName.ToLower().Contains(search) ||
                v.Appointment!.DentalService!.Name.ToLower().Contains(search) ||
                (v.ChiefComplaint != null && v.ChiefComplaint.ToLower().Contains(search)) ||
                (v.TreatmentNote != null && v.TreatmentNote.ToLower().Contains(search)) ||
                (v.ToothNumbers != null && v.ToothNumbers.ToLower().Contains(search)));
        }

        if (query.PatientId.HasValue)
        {
            visits = visits.Where(v => v.PatientId == query.PatientId.Value);
        }

        if (query.DoctorId.HasValue)
        {
            visits = visits.Where(v => v.DoctorProfileId == query.DoctorId.Value);
        }

        if (query.FromDate.HasValue)
        {
            visits = visits.Where(v => v.VisitDate >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            visits = visits.Where(v => v.VisitDate <= query.ToDate.Value);
        }

        if (statusFilter.HasValue)
        {
            visits = visits.Where(v => v.Status == statusFilter.Value);
        }

        var totalCount = await visits.CountAsync();

        var rows = await visits
            .OrderByDescending(v => v.VisitDate)
            .ThenByDescending(v => v.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(ProjectToRow)
            .ToListAsync();

        var result = new PaginatedResponse<VisitListItemDto>
        {
            Items = rows.Select(ToListItemDto).ToList(),
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return (result, null);
    }

    public async Task<VisitDto?> GetVisitByIdAsync(Guid id)
    {
        var row = await _context.Visits
            .Where(v => v.Id == id)
            .Select(ProjectToRow)
            .FirstOrDefaultAsync();

        return row is null ? null : ToDto(row);
    }

    public async Task<VisitDto?> GetVisitByAppointmentIdAsync(Guid appointmentId)
    {
        var row = await _context.Visits
            .Where(v => v.AppointmentId == appointmentId)
            .Select(ProjectToRow)
            .FirstOrDefaultAsync();

        return row is null ? null : ToDto(row);
    }

    public async Task<List<VisitListItemDto>> GetPatientVisitsAsync(Guid patientId)
    {
        var rows = await _context.Visits
            .Where(v => v.PatientId == patientId)
            .OrderByDescending(v => v.VisitDate)
            .ThenByDescending(v => v.CreatedAtUtc)
            .Select(ProjectToRow)
            .ToListAsync();

        return rows.Select(ToListItemDto).ToList();
    }

    public async Task<VisitStatsDto> GetVisitStatsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalVisits = await _context.Visits.CountAsync();
        var inProgressVisits = await _context.Visits.CountAsync(v => v.Status == VisitStatus.InProgress);
        var completedVisits = await _context.Visits.CountAsync(v => v.Status == VisitStatus.Completed);
        var followUpsScheduled = await _context.Visits.CountAsync(v => v.FollowUpDate != null && v.FollowUpDate >= today);

        return new VisitStatsDto
        {
            TotalVisits = totalVisits,
            InProgressVisits = inProgressVisits,
            CompletedVisits = completedVisits,
            FollowUpsScheduled = followUpsScheduled
        };
    }

    public async Task<Guid?> GetDoctorProfileIdForAppUserAsync(Guid appUserId)
    {
        var doctorProfileId = await _context.DoctorProfiles
            .Where(d => d.AppUserId == appUserId)
            .Select(d => (Guid?)d.Id)
            .FirstOrDefaultAsync();

        return doctorProfileId;
    }

    public async Task<(VisitDto? Visit, string? Error, bool Forbidden)> StartVisitAsync(Guid appointmentId, StartVisitDto request, Guid? restrictToDoctorProfileId)
    {
        var appointment = await _context.Appointments.FindAsync(appointmentId);
        if (appointment is null)
        {
            return (null, "Appointment not found.", false);
        }

        if (restrictToDoctorProfileId.HasValue && appointment.DoctorProfileId != restrictToDoctorProfileId.Value)
        {
            return (null, null, true);
        }

        var alreadyStarted = await _context.Visits.AnyAsync(v => v.AppointmentId == appointmentId);
        if (alreadyStarted)
        {
            return (null, "A visit has already been started for this appointment.", false);
        }

        if (appointment.Status is not (AppointmentStatus.Scheduled or AppointmentStatus.Arrived or AppointmentStatus.InProgress))
        {
            return (null, "Visits can only be started for appointments that are scheduled, arrived, or in progress.", false);
        }

        var now = DateTime.UtcNow;
        var visit = new Visit
        {
            Id = Guid.NewGuid(),
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            DoctorProfileId = appointment.DoctorProfileId,
            VisitDate = appointment.AppointmentDate,
            Status = VisitStatus.InProgress,
            ChiefComplaint = NormalizeOptional(request.ChiefComplaint),
            StartedAtUtc = now,
            CreatedAtUtc = now
        };

        appointment.Status = AppointmentStatus.InProgress;
        appointment.UpdatedAtUtc = now;

        _context.Visits.Add(visit);
        await _context.SaveChangesAsync();

        var started = await GetVisitByIdAsync(visit.Id);
        await _auditLogService.LogAsync(
            AuditActions.VisitStarted,
            AuditEntityTypes.Visit,
            visit.Id,
            DescribeVisit(started),
            $"Visit started for patient {DescribeVisit(started)}");

        return (started, null, false);
    }

    public async Task<(VisitDto? Visit, string? Error, bool Forbidden)> UpdateVisitAsync(Guid id, UpdateVisitDto request, Guid? restrictToDoctorProfileId)
    {
        var visit = await _context.Visits.FindAsync(id);
        if (visit is null)
        {
            return (null, null, false);
        }

        if (restrictToDoctorProfileId.HasValue && visit.DoctorProfileId != restrictToDoctorProfileId.Value)
        {
            return (null, null, true);
        }

        var followUpError = ValidateFollowUpDate(request.FollowUpDate);
        if (followUpError is not null)
        {
            return (null, followUpError, false);
        }

        ApplyNotes(visit, request);
        visit.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await GetVisitByIdAsync(id);
        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.Visit,
            id,
            DescribeVisit(updated),
            $"Visit updated for patient {DescribeVisit(updated)}");

        return (updated, null, false);
    }

    public async Task<(VisitDto? Visit, string? Error, bool Forbidden)> CompleteVisitAsync(Guid id, CompleteVisitDto request, Guid? restrictToDoctorProfileId)
    {
        var visit = await _context.Visits.FindAsync(id);
        if (visit is null)
        {
            return (null, null, false);
        }

        if (restrictToDoctorProfileId.HasValue && visit.DoctorProfileId != restrictToDoctorProfileId.Value)
        {
            return (null, null, true);
        }

        if (visit.Status == VisitStatus.Completed)
        {
            return (null, "This visit has already been completed.", false);
        }

        var followUpError = ValidateFollowUpDate(request.FollowUpDate);
        if (followUpError is not null)
        {
            return (null, followUpError, false);
        }

        var appointment = await _context.Appointments.FindAsync(visit.AppointmentId);
        if (appointment is null)
        {
            return (null, "The appointment linked to this visit could not be found.", false);
        }

        var now = DateTime.UtcNow;

        ApplyNotes(visit, request, preserveExistingWhenOmitted: true);
        visit.Status = VisitStatus.Completed;
        visit.CompletedAtUtc = now;
        visit.UpdatedAtUtc = now;

        appointment.Status = AppointmentStatus.Completed;
        appointment.UpdatedAtUtc = now;

        await _context.SaveChangesAsync();

        var completed = await GetVisitByIdAsync(id);
        await _auditLogService.LogAsync(
            AuditActions.VisitCompleted,
            AuditEntityTypes.Visit,
            id,
            DescribeVisit(completed),
            completed is null
                ? "Visit completed"
                : $"Visit completed for patient {completed.PatientFullName} by {completed.DoctorFullName}");

        return (completed, null, false);
    }

    /// <summary>
    /// Applies the doctor-entered note fields shared by Update and Complete.
    /// Admin/Doctor may call this again after completion for corrections —
    /// intentionally allowed for MVP rather than locking completed visits.
    /// Update always saves the full form and clears blank fields
    /// (<paramref name="preserveExistingWhenOmitted"/> = false). Complete may
    /// be called with a minimal payload just to close out the visit, so it
    /// keeps whatever notes are already on the visit instead of wiping them.
    /// </summary>
    private static void ApplyNotes(Visit visit, UpdateVisitDto request, bool preserveExistingWhenOmitted = false)
    {
        visit.ChiefComplaint = ResolveNote(visit.ChiefComplaint, request.ChiefComplaint, preserveExistingWhenOmitted);
        visit.DiagnosisNote = ResolveNote(visit.DiagnosisNote, request.DiagnosisNote, preserveExistingWhenOmitted);
        visit.TreatmentNote = ResolveNote(visit.TreatmentNote, request.TreatmentNote, preserveExistingWhenOmitted);
        visit.ToothNumbers = ResolveNote(visit.ToothNumbers, request.ToothNumbers, preserveExistingWhenOmitted);
        visit.PrescriptionNote = ResolveNote(visit.PrescriptionNote, request.PrescriptionNote, preserveExistingWhenOmitted);
        visit.FollowUpDate = request.FollowUpDate ?? (preserveExistingWhenOmitted ? visit.FollowUpDate : null);
        visit.InternalNotes = ResolveNote(visit.InternalNotes, request.InternalNotes, preserveExistingWhenOmitted);
    }

    private static string? ResolveNote(string? existing, string? incoming, bool preserveExistingWhenOmitted)
    {
        var normalized = NormalizeOptional(incoming);
        return normalized ?? (preserveExistingWhenOmitted ? existing : null);
    }

    private static string? ValidateFollowUpDate(DateOnly? followUpDate)
    {
        if (followUpDate.HasValue && followUpDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return "Follow-up date cannot be in the past.";
        }

        return null;
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string DescribeVisit(VisitDto? visit) => visit?.PatientFullName ?? "unknown patient";

    private static VisitDto ToDto(VisitRow row) => new()
    {
        Id = row.Id,
        AppointmentId = row.AppointmentId,
        AppointmentDate = row.AppointmentDate,
        AppointmentStartTime = row.AppointmentStartTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        AppointmentEndTime = row.AppointmentEndTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        PatientPhoneNumber = row.PatientPhoneNumber,
        DoctorProfileId = row.DoctorProfileId,
        DoctorFullName = row.DoctorFullName,
        ServiceName = row.ServiceName,
        VisitDate = row.VisitDate,
        Status = row.Status.ToString(),
        ChiefComplaint = row.ChiefComplaint,
        DiagnosisNote = row.DiagnosisNote,
        TreatmentNote = row.TreatmentNote,
        ToothNumbers = row.ToothNumbers,
        PrescriptionNote = row.PrescriptionNote,
        FollowUpDate = row.FollowUpDate,
        InternalNotes = row.InternalNotes,
        StartedAtUtc = row.StartedAtUtc,
        CompletedAtUtc = row.CompletedAtUtc,
        CreatedAtUtc = row.CreatedAtUtc,
        UpdatedAtUtc = row.UpdatedAtUtc
    };

    private static VisitListItemDto ToListItemDto(VisitRow row) => new()
    {
        Id = row.Id,
        AppointmentId = row.AppointmentId,
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        PatientPhoneNumber = row.PatientPhoneNumber,
        DoctorProfileId = row.DoctorProfileId,
        DoctorFullName = row.DoctorFullName,
        ServiceName = row.ServiceName,
        VisitDate = row.VisitDate,
        Status = row.Status.ToString(),
        FollowUpDate = row.FollowUpDate
    };
}
