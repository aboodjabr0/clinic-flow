using System.Globalization;
using System.Linq.Expressions;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class AppointmentService : IAppointmentService
{
    private const int MaxPageSize = 100;
    private const int MaxCalendarRangeDays = 62;
    private const string TimeFormat = "HH:mm";

    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public AppointmentService(AppDbContext context, IAuditLogService auditLogService, ICurrentUserService currentUserService)
    {
        _context = context;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Flat, server-translatable projection carrying the display data pulled
    /// in via joins to Patient/DoctorProfile/DentalService. Kept as raw
    /// TimeOnly (not "HH:mm" strings) because string formatting with a
    /// custom format string cannot be translated to SQL — that conversion
    /// happens client-side in <see cref="ToDto"/>/<see cref="ToListItemDto"/>
    /// after the query has already executed.
    /// </summary>
    private record AppointmentRow(
        Guid Id,
        Guid PatientId,
        string PatientFullName,
        string PatientPhoneNumber,
        Guid DoctorProfileId,
        string DoctorFullName,
        Guid DentalServiceId,
        string ServiceName,
        decimal ServicePrice,
        DateOnly AppointmentDate,
        TimeOnly StartTime,
        TimeOnly EndTime,
        AppointmentStatus Status,
        string? Reason,
        string? Notes,
        string? CancellationReason,
        DateTime CreatedAtUtc,
        DateTime? UpdatedAtUtc);

    private static readonly Expression<Func<Appointment, AppointmentRow>> ProjectToRow = a => new AppointmentRow(
        a.Id,
        a.PatientId,
        a.Patient!.FirstName + " " + a.Patient.LastName,
        a.Patient.PhoneNumber,
        a.DoctorProfileId,
        a.DoctorProfile!.FullName,
        a.DentalServiceId,
        a.DentalService!.Name,
        a.DentalService.DefaultPrice,
        a.AppointmentDate,
        a.StartTime,
        a.EndTime,
        a.Status,
        a.Reason,
        a.Notes,
        a.CancellationReason,
        a.CreatedAtUtc,
        a.UpdatedAtUtc);

    public async Task<(PaginatedResponse<AppointmentListItemDto>? Result, string? Error)> GetAppointmentsAsync(AppointmentQueryDto query)
    {
        AppointmentStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<AppointmentStatus>(query.Status, ignoreCase: true, out var parsedStatus))
            {
                return (null, "Invalid status filter.");
            }
            statusFilter = parsedStatus;
        }

        var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize < 1 ? 10 : Math.Min(query.PageSize, MaxPageSize);

        var (effectiveDoctorId, doctorHasNoProfile) = await ResolveDoctorScopeAsync(query.DoctorId);
        if (doctorHasNoProfile)
        {
            return (new PaginatedResponse<AppointmentListItemDto>
            {
                Items = [],
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = 0
            }, null);
        }

        var appointments = _context.Appointments.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            appointments = appointments.Where(a =>
                (a.Patient!.FirstName + " " + a.Patient.LastName).ToLower().Contains(search) ||
                a.Patient.PhoneNumber.ToLower().Contains(search) ||
                a.DoctorProfile!.FullName.ToLower().Contains(search) ||
                a.DentalService!.Name.ToLower().Contains(search) ||
                (a.Reason != null && a.Reason.ToLower().Contains(search)));
        }

        if (query.Date.HasValue)
        {
            appointments = appointments.Where(a => a.AppointmentDate == query.Date.Value);
        }

        if (query.FromDate.HasValue)
        {
            appointments = appointments.Where(a => a.AppointmentDate >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            appointments = appointments.Where(a => a.AppointmentDate <= query.ToDate.Value);
        }

        if (effectiveDoctorId.HasValue)
        {
            appointments = appointments.Where(a => a.DoctorProfileId == effectiveDoctorId.Value);
        }

        if (query.PatientId.HasValue)
        {
            appointments = appointments.Where(a => a.PatientId == query.PatientId.Value);
        }

        if (query.ServiceId.HasValue)
        {
            appointments = appointments.Where(a => a.DentalServiceId == query.ServiceId.Value);
        }

        if (statusFilter.HasValue)
        {
            appointments = appointments.Where(a => a.Status == statusFilter.Value);
        }

        var totalCount = await appointments.CountAsync();

        var rows = await appointments
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(ProjectToRow)
            .ToListAsync();

        var result = new PaginatedResponse<AppointmentListItemDto>
        {
            Items = rows.Select(ToListItemDto).ToList(),
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return (result, null);
    }

    /// <summary>
    /// Unpaginated projection for calendar day/week views. Doctors are always
    /// scoped to their own DoctorProfile (resolved via the AppUserId link),
    /// regardless of any doctorId query parameter — Admin/Receptionist can
    /// optionally filter by doctorId or see all doctors.
    /// </summary>
    public async Task<(List<CalendarAppointmentDto>? Result, string? Error)> GetCalendarAppointmentsAsync(CalendarQueryDto query)
    {
        if (!query.StartDate.HasValue || !query.EndDate.HasValue)
        {
            return (null, "startDate and endDate are required.");
        }

        if (query.EndDate.Value < query.StartDate.Value)
        {
            return (null, "endDate must be on or after startDate.");
        }

        if (query.EndDate.Value.DayNumber - query.StartDate.Value.DayNumber > MaxCalendarRangeDays)
        {
            return (null, $"Date range cannot exceed {MaxCalendarRangeDays} days.");
        }

        AppointmentStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<AppointmentStatus>(query.Status, ignoreCase: true, out var parsedStatus))
            {
                return (null, "Invalid status filter.");
            }
            statusFilter = parsedStatus;
        }

        var appointments = _context.Appointments
            .Where(a => a.AppointmentDate >= query.StartDate.Value && a.AppointmentDate <= query.EndDate.Value);

        var (effectiveDoctorId, doctorHasNoProfile) = await ResolveDoctorScopeAsync(query.DoctorId);
        if (doctorHasNoProfile)
        {
            return (new List<CalendarAppointmentDto>(), null);
        }

        if (effectiveDoctorId.HasValue)
        {
            appointments = appointments.Where(a => a.DoctorProfileId == effectiveDoctorId.Value);
        }

        if (statusFilter.HasValue)
        {
            appointments = appointments.Where(a => a.Status == statusFilter.Value);
        }

        var rows = await appointments
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .Select(a => new CalendarRow(
                a.Id,
                a.PatientId,
                a.Patient!.FirstName + " " + a.Patient.LastName,
                a.DoctorProfileId,
                a.DoctorProfile!.FullName,
                a.DentalServiceId,
                a.DentalService!.Name,
                a.AppointmentDate,
                a.StartTime,
                a.EndTime,
                a.Status,
                a.Reason,
                _context.Visits.Any(v => v.AppointmentId == a.Id),
                _context.Invoices
                    .Where(i => i.AppointmentId == a.Id)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => (PaymentStatus?)i.Status)
                    .FirstOrDefault()))
            .ToListAsync();

        return (rows.Select(ToCalendarDto).ToList(), null);
    }

    private record CalendarRow(
        Guid Id,
        Guid PatientId,
        string PatientFullName,
        Guid DoctorProfileId,
        string DoctorFullName,
        Guid DentalServiceId,
        string ServiceName,
        DateOnly AppointmentDate,
        TimeOnly StartTime,
        TimeOnly EndTime,
        AppointmentStatus Status,
        string? Reason,
        bool HasVisit,
        PaymentStatus? InvoiceStatus);

    private static CalendarAppointmentDto ToCalendarDto(CalendarRow row) => new()
    {
        Id = row.Id,
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        DoctorProfileId = row.DoctorProfileId,
        DoctorFullName = row.DoctorFullName,
        DentalServiceId = row.DentalServiceId,
        ServiceName = row.ServiceName,
        AppointmentDate = row.AppointmentDate,
        StartTime = row.StartTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        EndTime = row.EndTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        Status = row.Status.ToString(),
        Reason = row.Reason,
        HasVisit = row.HasVisit,
        InvoiceStatus = row.InvoiceStatus?.ToString()
    };

    /// <summary>
    /// Resolves doctorId scoping shared by the list and calendar queries: a
    /// Doctor caller is always scoped to their own DoctorProfile (resolved
    /// via the AppUserId link), ignoring any requested doctorId entirely;
    /// Admin/Receptionist may optionally filter by the requested doctorId.
    /// </summary>
    private async Task<(Guid? EffectiveDoctorId, bool DoctorHasNoProfile)> ResolveDoctorScopeAsync(Guid? requestedDoctorId)
    {
        if (_currentUserService.Role != nameof(UserRole.Doctor))
        {
            return (requestedDoctorId, false);
        }

        var ownDoctorProfileId = await _context.DoctorProfiles
            .Where(d => d.AppUserId == _currentUserService.UserId)
            .Select(d => (Guid?)d.Id)
            .FirstOrDefaultAsync();

        return ownDoctorProfileId is null ? (null, true) : (ownDoctorProfileId, false);
    }

    public async Task<List<AppointmentListItemDto>> GetTodayAppointmentsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rows = await _context.Appointments
            .Where(a => a.AppointmentDate == today)
            .OrderBy(a => a.StartTime)
            .Select(ProjectToRow)
            .ToListAsync();

        return rows.Select(ToListItemDto).ToList();
    }

    public async Task<AppointmentDto?> GetAppointmentByIdAsync(Guid id)
    {
        var row = await _context.Appointments
            .Where(a => a.Id == id)
            .Select(ProjectToRow)
            .FirstOrDefaultAsync();

        return row is null ? null : ToDto(row);
    }

    public async Task<List<AppointmentListItemDto>> GetPatientAppointmentsAsync(Guid patientId)
    {
        var rows = await _context.Appointments
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.AppointmentDate)
            .ThenByDescending(a => a.StartTime)
            .Select(ProjectToRow)
            .ToListAsync();

        return rows.Select(ToListItemDto).ToList();
    }

    public async Task<AppointmentStatsDto> GetAppointmentStatsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalAppointments = await _context.Appointments.CountAsync();
        var todayAppointments = await _context.Appointments.CountAsync(a => a.AppointmentDate == today);
        var scheduledAppointments = await _context.Appointments.CountAsync(a => a.Status == AppointmentStatus.Scheduled);
        var completedAppointments = await _context.Appointments.CountAsync(a => a.Status == AppointmentStatus.Completed);
        var cancelledOrNoShowAppointments = await _context.Appointments.CountAsync(
            a => a.Status == AppointmentStatus.Cancelled || a.Status == AppointmentStatus.NoShow);

        return new AppointmentStatsDto
        {
            TotalAppointments = totalAppointments,
            TodayAppointments = todayAppointments,
            ScheduledAppointments = scheduledAppointments,
            CompletedAppointments = completedAppointments,
            CancelledOrNoShowAppointments = cancelledOrNoShowAppointments
        };
    }

    public async Task<(AppointmentDto? Appointment, string? Error)> CreateAppointmentAsync(CreateAppointmentDto request)
    {
        var (startTime, endTime, timeError) = ParseAndValidateTimes(request.StartTime, request.EndTime);
        if (timeError is not null)
        {
            return (null, timeError);
        }

        if (request.AppointmentDate < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return (null, "Appointment date cannot be in the past.");
        }

        var referenceError = await ValidateReferencesAsync(request.PatientId, request.DoctorProfileId, request.DentalServiceId);
        if (referenceError is not null)
        {
            return (null, referenceError);
        }

        var hasConflict = await HasConflictAsync(request.DoctorProfileId, request.AppointmentDate, startTime!.Value, endTime!.Value, excludingAppointmentId: null);
        if (hasConflict)
        {
            return (null, "This doctor already has an appointment that overlaps with the selected time.");
        }

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            DoctorProfileId = request.DoctorProfileId,
            DentalServiceId = request.DentalServiceId,
            AppointmentDate = request.AppointmentDate,
            StartTime = startTime.Value,
            EndTime = endTime.Value,
            Status = AppointmentStatus.Scheduled,
            Reason = NormalizeOptional(request.Reason),
            Notes = NormalizeOptional(request.Notes),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        var created = await GetAppointmentByIdAsync(appointment.Id);
        await _auditLogService.LogAsync(
            AuditActions.Created,
            AuditEntityTypes.Appointment,
            appointment.Id,
            DescribeAppointment(created),
            $"Appointment created for {DescribeAppointment(created)}");

        return (created, null);
    }

    public async Task<(AppointmentDto? Appointment, string? Error)> UpdateAppointmentAsync(Guid id, UpdateAppointmentDto request)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment is null)
        {
            return (null, null);
        }

        var (startTime, endTime, timeError) = ParseAndValidateTimes(request.StartTime, request.EndTime);
        if (timeError is not null)
        {
            return (null, timeError);
        }

        var referenceError = await ValidateReferencesAsync(request.PatientId, request.DoctorProfileId, request.DentalServiceId);
        if (referenceError is not null)
        {
            return (null, referenceError);
        }

        var hasConflict = await HasConflictAsync(request.DoctorProfileId, request.AppointmentDate, startTime!.Value, endTime!.Value, excludingAppointmentId: id);
        if (hasConflict)
        {
            return (null, "This doctor already has an appointment that overlaps with the selected time.");
        }

        appointment.PatientId = request.PatientId;
        appointment.DoctorProfileId = request.DoctorProfileId;
        appointment.DentalServiceId = request.DentalServiceId;
        appointment.AppointmentDate = request.AppointmentDate;
        appointment.StartTime = startTime.Value;
        appointment.EndTime = endTime.Value;
        appointment.Reason = NormalizeOptional(request.Reason);
        appointment.Notes = NormalizeOptional(request.Notes);
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await GetAppointmentByIdAsync(id);
        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.Appointment,
            id,
            DescribeAppointment(updated),
            $"Appointment updated for {DescribeAppointment(updated)}");

        return (updated, null);
    }

    public async Task<(AppointmentDto? Appointment, string? Error)> UpdateAppointmentStatusAsync(Guid id, string status)
    {
        if (!Enum.TryParse<AppointmentStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            return (null, "Invalid appointment status.");
        }

        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment is null)
        {
            return (null, null);
        }

        appointment.Status = parsedStatus;
        if (parsedStatus != AppointmentStatus.Cancelled)
        {
            appointment.CancellationReason = null;
        }
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var statusChanged = await GetAppointmentByIdAsync(id);
        await _auditLogService.LogAsync(
            AuditActions.StatusChanged,
            AuditEntityTypes.Appointment,
            id,
            DescribeAppointment(statusChanged),
            $"Appointment status changed to {parsedStatus} for {DescribeAppointment(statusChanged)}");

        return (statusChanged, null);
    }

    public async Task<(AppointmentDto? Appointment, string? Error)> CancelAppointmentAsync(Guid id, string? cancellationReason)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment is null)
        {
            return (null, null);
        }

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancellationReason = NormalizeOptional(cancellationReason);
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var cancelled = await GetAppointmentByIdAsync(id);
        await _auditLogService.LogAsync(
            AuditActions.Cancelled,
            AuditEntityTypes.Appointment,
            id,
            DescribeAppointment(cancelled),
            $"Appointment cancelled for {DescribeAppointment(cancelled)}");

        return (cancelled, null);
    }

    private static string DescribeAppointment(AppointmentDto? appointment) =>
        appointment is null
            ? "unknown patient"
            : $"{appointment.PatientFullName} with {appointment.DoctorFullName} on {appointment.AppointmentDate:yyyy-MM-dd}";

    private async Task<bool> HasConflictAsync(Guid doctorProfileId, DateOnly date, TimeOnly start, TimeOnly end, Guid? excludingAppointmentId)
    {
        return await _context.Appointments.AnyAsync(a =>
            a.DoctorProfileId == doctorProfileId &&
            a.AppointmentDate == date &&
            a.Id != excludingAppointmentId &&
            a.Status != AppointmentStatus.Cancelled &&
            a.Status != AppointmentStatus.NoShow &&
            a.StartTime < end &&
            a.EndTime > start);
    }

    private async Task<string?> ValidateReferencesAsync(Guid patientId, Guid doctorProfileId, Guid dentalServiceId)
    {
        if (!await _context.Patients.AnyAsync(p => p.Id == patientId))
        {
            return "Patient not found.";
        }

        if (!await _context.DoctorProfiles.AnyAsync(d => d.Id == doctorProfileId))
        {
            return "Doctor not found.";
        }

        if (!await _context.DentalServices.AnyAsync(s => s.Id == dentalServiceId))
        {
            return "Dental service not found.";
        }

        return null;
    }

    private static (TimeOnly? Start, TimeOnly? End, string? Error) ParseAndValidateTimes(string startTime, string endTime)
    {
        if (!TimeOnly.TryParseExact(startTime, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var start))
        {
            return (null, null, "Start time must be in HH:mm format.");
        }

        if (!TimeOnly.TryParseExact(endTime, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var end))
        {
            return (null, null, "End time must be in HH:mm format.");
        }

        if (end <= start)
        {
            return (null, null, "End time must be after start time.");
        }

        return (start, end, null);
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static AppointmentDto ToDto(AppointmentRow row) => new()
    {
        Id = row.Id,
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        PatientPhoneNumber = row.PatientPhoneNumber,
        DoctorProfileId = row.DoctorProfileId,
        DoctorFullName = row.DoctorFullName,
        DentalServiceId = row.DentalServiceId,
        ServiceName = row.ServiceName,
        ServicePrice = row.ServicePrice,
        AppointmentDate = row.AppointmentDate,
        StartTime = row.StartTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        EndTime = row.EndTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        Status = row.Status.ToString(),
        Reason = row.Reason,
        Notes = row.Notes,
        CancellationReason = row.CancellationReason,
        CreatedAtUtc = row.CreatedAtUtc,
        UpdatedAtUtc = row.UpdatedAtUtc
    };

    private static AppointmentListItemDto ToListItemDto(AppointmentRow row) => new()
    {
        Id = row.Id,
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        PatientPhoneNumber = row.PatientPhoneNumber,
        DoctorProfileId = row.DoctorProfileId,
        DoctorFullName = row.DoctorFullName,
        DentalServiceId = row.DentalServiceId,
        ServiceName = row.ServiceName,
        AppointmentDate = row.AppointmentDate,
        StartTime = row.StartTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        EndTime = row.EndTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
        Status = row.Status.ToString(),
        Reason = row.Reason
    };
}
