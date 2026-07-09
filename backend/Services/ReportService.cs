using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Reports;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class ReportService : IReportService
{
    private const string TimeFormat = "HH:mm";

    /// <summary>Hard cap on report rows so a wide date range cannot pull the whole table.</summary>
    private const int MaxRows = 500;

    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid?> GetDoctorProfileIdForAppUserAsync(Guid appUserId)
    {
        return await _context.DoctorProfiles
            .AsNoTracking()
            .Where(d => d.AppUserId == appUserId)
            .Select(d => (Guid?)d.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<(AppointmentReportDto? Report, string? Error)> GetAppointmentReportAsync(ReportQueryDto query, Guid? restrictToDoctorProfileId)
    {
        var (fromDate, toDate, rangeError) = ResolveDateRange(query);
        if (rangeError is not null)
        {
            return (null, rangeError);
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

        var appointments = _context.Appointments.AsNoTracking()
            .Where(a => a.AppointmentDate >= fromDate && a.AppointmentDate <= toDate);

        if (restrictToDoctorProfileId.HasValue)
        {
            appointments = appointments.Where(a => a.DoctorProfileId == restrictToDoctorProfileId.Value);
        }
        else if (query.DoctorId.HasValue)
        {
            appointments = appointments.Where(a => a.DoctorProfileId == query.DoctorId.Value);
        }

        if (statusFilter.HasValue)
        {
            appointments = appointments.Where(a => a.Status == statusFilter.Value);
        }

        var totalCount = await appointments.CountAsync();
        var completedCount = await appointments.CountAsync(a => a.Status == AppointmentStatus.Completed);
        var cancelledOrNoShowCount = await appointments.CountAsync(a =>
            a.Status == AppointmentStatus.Cancelled || a.Status == AppointmentStatus.NoShow);

        var rows = await appointments
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .Take(MaxRows)
            .Select(a => new AppointmentReportRowDto
            {
                Id = a.Id,
                AppointmentDate = a.AppointmentDate,
                StartTime = a.StartTime.ToString(TimeFormat),
                EndTime = a.EndTime.ToString(TimeFormat),
                PatientFullName = a.Patient!.FirstName + " " + a.Patient.LastName,
                DoctorFullName = a.DoctorProfile!.FullName,
                ServiceName = a.DentalService!.Name,
                Status = a.Status.ToString()
            })
            .ToListAsync();

        return (new AppointmentReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalCount = totalCount,
            CompletedCount = completedCount,
            CancelledOrNoShowCount = cancelledOrNoShowCount,
            Rows = rows
        }, null);
    }

    public async Task<(RevenueReportDto? Report, string? Error)> GetRevenueReportAsync(ReportQueryDto query)
    {
        var (fromDate, toDate, rangeError) = ResolveDateRange(query);
        if (rangeError is not null)
        {
            return (null, rangeError);
        }

        var invoices = _context.Invoices.AsNoTracking()
            .Where(i => i.IssueDate >= fromDate && i.IssueDate <= toDate);

        var invoiceCount = await invoices.CountAsync();
        var totalInvoiced = await invoices.SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;
        var totalPaid = await invoices.SumAsync(i => (decimal?)i.PaidAmount) ?? 0m;
        var totalOutstanding = await invoices.SumAsync(i => (decimal?)i.RemainingAmount) ?? 0m;

        var rows = await invoices
            .OrderByDescending(i => i.IssueDate)
            .ThenByDescending(i => i.InvoiceNumber)
            .Take(MaxRows)
            .Select(i => new RevenueReportRowDto
            {
                InvoiceId = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                IssueDate = i.IssueDate,
                PatientFullName = i.Patient!.FirstName + " " + i.Patient.LastName,
                ServiceName = i.DentalService != null ? i.DentalService.Name : null,
                TotalAmount = i.TotalAmount,
                PaidAmount = i.PaidAmount,
                RemainingAmount = i.RemainingAmount,
                Status = i.Status.ToString()
            })
            .ToListAsync();

        return (new RevenueReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            InvoiceCount = invoiceCount,
            TotalInvoiced = totalInvoiced,
            TotalPaid = totalPaid,
            TotalOutstanding = totalOutstanding,
            Rows = rows
        }, null);
    }

    public async Task<(PatientReportDto? Report, string? Error)> GetPatientReportAsync(ReportQueryDto query)
    {
        var (fromDate, toDate, rangeError) = ResolveDateRange(query);
        if (rangeError is not null)
        {
            return (null, rangeError);
        }

        // Registration timestamps are stored as UTC DateTime, so the DateOnly
        // range is widened to [from 00:00, to+1day 00:00) in UTC.
        var fromUtc = DateTime.SpecifyKind(fromDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var toUtcExclusive = DateTime.SpecifyKind(toDate.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        var patients = _context.Patients.AsNoTracking()
            .Where(p => p.CreatedAtUtc >= fromUtc && p.CreatedAtUtc < toUtcExclusive);

        if (query.IsActive.HasValue)
        {
            patients = patients.Where(p => p.IsActive == query.IsActive.Value);
        }

        var totalCount = await patients.CountAsync();
        var activeCount = await patients.CountAsync(p => p.IsActive);

        var rows = await patients
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(MaxRows)
            .Select(p => new PatientReportRowDto
            {
                Id = p.Id,
                FullName = p.FirstName + " " + p.LastName,
                PhoneNumber = p.PhoneNumber,
                Gender = p.Gender.ToString(),
                IsActive = p.IsActive,
                RegisteredDate = DateOnly.FromDateTime(p.CreatedAtUtc)
            })
            .ToListAsync();

        return (new PatientReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalCount = totalCount,
            ActiveCount = activeCount,
            Rows = rows
        }, null);
    }

    /// <summary>Defaults to the current calendar month when either bound is missing.</summary>
    private static (DateOnly FromDate, DateOnly ToDate, string? Error) ResolveDateRange(ReportQueryDto query)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var fromDate = query.FromDate ?? monthStart;
        var toDate = query.ToDate ?? (query.FromDate.HasValue ? query.FromDate.Value.AddMonths(1).AddDays(-1) : monthEnd);

        if (fromDate > toDate)
        {
            return (fromDate, toDate, "fromDate cannot be after toDate.");
        }

        return (fromDate, toDate, null);
    }
}
