using System.Globalization;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Dashboard;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class DashboardService : IDashboardService
{
    private const string TimeFormat = "HH:mm";
    private const int RecentListSize = 5;
    private const int FollowUpListSize = 10;

    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
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

    public async Task<DashboardSummaryDto> GetSummaryAsync(Guid? restrictToDoctorProfileId, bool includeFinancials)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (monthStart, monthEnd) = CurrentMonthRange(today);
        var monthStartUtc = MonthStartUtc(monthStart);

        var totalPatients = await _context.Patients.AsNoTracking().CountAsync();
        var activePatients = await _context.Patients.AsNoTracking().CountAsync(p => p.IsActive);
        var newPatientsThisMonth = await _context.Patients.AsNoTracking()
            .CountAsync(p => p.CreatedAtUtc >= monthStartUtc);

        var appointments = ScopedAppointments(restrictToDoctorProfileId);
        var todayAppointments = await appointments.CountAsync(a => a.AppointmentDate == today);
        var scheduledAppointments = await appointments.CountAsync(a => a.Status == AppointmentStatus.Scheduled);
        var completedAppointmentsThisMonth = await appointments.CountAsync(a =>
            a.Status == AppointmentStatus.Completed &&
            a.AppointmentDate >= monthStart && a.AppointmentDate <= monthEnd);

        var visits = ScopedVisits(restrictToDoctorProfileId);
        var inProgressVisits = await visits.CountAsync(v => v.Status == VisitStatus.InProgress);
        var completedVisitsThisMonth = await visits.CountAsync(v =>
            v.Status == VisitStatus.Completed &&
            v.VisitDate >= monthStart && v.VisitDate <= monthEnd);

        int? unpaidInvoices = null;
        int? partiallyPaidInvoices = null;
        int? paidInvoicesThisMonth = null;
        decimal? totalRevenueThisMonth = null;
        decimal? outstandingBalance = null;

        if (includeFinancials)
        {
            unpaidInvoices = await _context.Invoices.AsNoTracking()
                .CountAsync(i => i.Status == PaymentStatus.Unpaid);
            partiallyPaidInvoices = await _context.Invoices.AsNoTracking()
                .CountAsync(i => i.Status == PaymentStatus.PartiallyPaid);
            paidInvoicesThisMonth = await _context.Invoices.AsNoTracking()
                .CountAsync(i => i.Status == PaymentStatus.Paid && i.IssueDate >= monthStart && i.IssueDate <= monthEnd);
            totalRevenueThisMonth = await _context.Payments.AsNoTracking()
                .Where(p => p.PaymentDate >= monthStart && p.PaymentDate <= monthEnd)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;
            outstandingBalance = await _context.Invoices.AsNoTracking()
                .SumAsync(i => (decimal?)i.RemainingAmount) ?? 0m;
        }

        return new DashboardSummaryDto
        {
            TotalPatients = totalPatients,
            ActivePatients = activePatients,
            NewPatientsThisMonth = newPatientsThisMonth,
            TodayAppointments = todayAppointments,
            ScheduledAppointments = scheduledAppointments,
            CompletedAppointmentsThisMonth = completedAppointmentsThisMonth,
            InProgressVisits = inProgressVisits,
            CompletedVisitsThisMonth = completedVisitsThisMonth,
            UnpaidInvoices = unpaidInvoices,
            PartiallyPaidInvoices = partiallyPaidInvoices,
            PaidInvoicesThisMonth = paidInvoicesThisMonth,
            TotalRevenueThisMonth = totalRevenueThisMonth,
            OutstandingBalance = outstandingBalance
        };
    }

    public async Task<TodayClinicDto> GetTodayAsync(Guid? restrictToDoctorProfileId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var appointments = await ScopedAppointments(restrictToDoctorProfileId)
            .Where(a => a.AppointmentDate == today)
            .OrderBy(a => a.StartTime)
            .Select(ProjectToRecentAppointment())
            .ToListAsync();

        return new TodayClinicDto
        {
            Date = today,
            TotalAppointments = appointments.Count,
            Arrived = appointments.Count(a => a.Status == nameof(AppointmentStatus.Arrived)),
            InProgress = appointments.Count(a => a.Status == nameof(AppointmentStatus.InProgress)),
            CompletedToday = appointments.Count(a => a.Status == nameof(AppointmentStatus.Completed)),
            CancelledOrNoShowToday = appointments.Count(a =>
                a.Status == nameof(AppointmentStatus.Cancelled) || a.Status == nameof(AppointmentStatus.NoShow)),
            Appointments = appointments
        };
    }

    public async Task<DashboardRevenueDto> GetRevenueAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (monthStart, monthEnd) = CurrentMonthRange(today);

        var currentMonthRevenue = await _context.Payments.AsNoTracking()
            .Where(p => p.PaymentDate >= monthStart && p.PaymentDate <= monthEnd)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var currentMonthOutstanding = await _context.Invoices.AsNoTracking()
            .Where(i => i.IssueDate >= monthStart && i.IssueDate <= monthEnd)
            .SumAsync(i => (decimal?)i.RemainingAmount) ?? 0m;

        var totalPaidAmount = await _context.Invoices.AsNoTracking()
            .SumAsync(i => (decimal?)i.PaidAmount) ?? 0m;

        var totalUnpaidAmount = await _context.Invoices.AsNoTracking()
            .SumAsync(i => (decimal?)i.RemainingAmount) ?? 0m;

        var recentPaidInvoices = await _context.Invoices.AsNoTracking()
            .Where(i => i.Status == PaymentStatus.Paid)
            .OrderByDescending(i => i.UpdatedAtUtc ?? i.CreatedAtUtc)
            .Take(RecentListSize)
            .Select(ProjectToRecentInvoice())
            .ToListAsync();

        var firstMonth = monthStart.AddMonths(-5);
        var monthlyTotals = await _context.Payments.AsNoTracking()
            .Where(p => p.PaymentDate >= firstMonth)
            .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(p => p.Amount) })
            .ToListAsync();

        var monthlyRevenue = new List<MonthlyRevenuePointDto>(6);
        for (var month = firstMonth; month <= monthStart; month = month.AddMonths(1))
        {
            var total = monthlyTotals
                .FirstOrDefault(m => m.Year == month.Year && m.Month == month.Month)?.Total ?? 0m;

            monthlyRevenue.Add(new MonthlyRevenuePointDto
            {
                Year = month.Year,
                Month = month.Month,
                Label = month.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                TotalPaid = total
            });
        }

        return new DashboardRevenueDto
        {
            CurrentMonthRevenue = currentMonthRevenue,
            CurrentMonthOutstanding = currentMonthOutstanding,
            TotalPaidAmount = totalPaidAmount,
            TotalUnpaidAmount = totalUnpaidAmount,
            RecentPaidInvoices = recentPaidInvoices,
            MonthlyRevenue = monthlyRevenue
        };
    }

    public async Task<AppointmentStatusBreakdownDto> GetStatusBreakdownAsync(Guid? restrictToDoctorProfileId)
    {
        var counts = await ScopedAppointments(restrictToDoctorProfileId)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int CountFor(AppointmentStatus status) =>
            counts.FirstOrDefault(c => c.Status == status)?.Count ?? 0;

        return new AppointmentStatusBreakdownDto
        {
            Scheduled = CountFor(AppointmentStatus.Scheduled),
            Arrived = CountFor(AppointmentStatus.Arrived),
            InProgress = CountFor(AppointmentStatus.InProgress),
            Completed = CountFor(AppointmentStatus.Completed),
            Cancelled = CountFor(AppointmentStatus.Cancelled),
            NoShow = CountFor(AppointmentStatus.NoShow)
        };
    }

    public async Task<RecentActivityDto> GetRecentActivityAsync(Guid? restrictToDoctorProfileId, bool includeInvoices)
    {
        var recentAppointments = await ScopedAppointments(restrictToDoctorProfileId)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(RecentListSize)
            .Select(ProjectToRecentAppointment())
            .ToListAsync();

        var recentVisits = await ScopedVisits(restrictToDoctorProfileId)
            .OrderByDescending(v => v.CreatedAtUtc)
            .Take(RecentListSize)
            .Select(v => new RecentVisitDto
            {
                Id = v.Id,
                PatientFullName = v.Patient!.FirstName + " " + v.Patient.LastName,
                DoctorFullName = v.DoctorProfile!.FullName,
                ServiceName = v.Appointment!.DentalService!.Name,
                VisitDate = v.VisitDate,
                Status = v.Status.ToString(),
                FollowUpDate = v.FollowUpDate
            })
            .ToListAsync();

        var recentInvoices = includeInvoices
            ? await _context.Invoices.AsNoTracking()
                .OrderByDescending(i => i.CreatedAtUtc)
                .Take(RecentListSize)
                .Select(ProjectToRecentInvoice())
                .ToListAsync()
            : new List<RecentInvoiceDto>();

        return new RecentActivityDto
        {
            RecentAppointments = recentAppointments,
            RecentVisits = recentVisits,
            RecentInvoices = recentInvoices
        };
    }

    public async Task<List<UpcomingFollowUpDto>> GetUpcomingFollowUpsAsync(Guid? restrictToDoctorProfileId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        return await ScopedVisits(restrictToDoctorProfileId)
            .Where(v => v.FollowUpDate != null && v.FollowUpDate >= today)
            .OrderBy(v => v.FollowUpDate)
            .Take(FollowUpListSize)
            .Select(v => new UpcomingFollowUpDto
            {
                VisitId = v.Id,
                PatientId = v.PatientId,
                PatientFullName = v.Patient!.FirstName + " " + v.Patient.LastName,
                PatientPhoneNumber = v.Patient.PhoneNumber,
                DoctorFullName = v.DoctorProfile!.FullName,
                FollowUpDate = v.FollowUpDate!.Value
            })
            .ToListAsync();
    }

    /// <summary>
    /// Scoping to Guid.Empty (a Doctor login with no linked profile) matches
    /// no rows on purpose — such doctors see empty data, never clinic-wide data.
    /// </summary>
    private IQueryable<Appointment> ScopedAppointments(Guid? restrictToDoctorProfileId)
    {
        var appointments = _context.Appointments.AsNoTracking();
        return restrictToDoctorProfileId.HasValue
            ? appointments.Where(a => a.DoctorProfileId == restrictToDoctorProfileId.Value)
            : appointments;
    }

    private IQueryable<Visit> ScopedVisits(Guid? restrictToDoctorProfileId)
    {
        var visits = _context.Visits.AsNoTracking();
        return restrictToDoctorProfileId.HasValue
            ? visits.Where(v => v.DoctorProfileId == restrictToDoctorProfileId.Value)
            : visits;
    }

    private static System.Linq.Expressions.Expression<Func<Appointment, RecentAppointmentDto>> ProjectToRecentAppointment() =>
        a => new RecentAppointmentDto
        {
            Id = a.Id,
            PatientFullName = a.Patient!.FirstName + " " + a.Patient.LastName,
            DoctorFullName = a.DoctorProfile!.FullName,
            ServiceName = a.DentalService!.Name,
            AppointmentDate = a.AppointmentDate,
            StartTime = a.StartTime.ToString(TimeFormat),
            EndTime = a.EndTime.ToString(TimeFormat),
            Status = a.Status.ToString()
        };

    private static System.Linq.Expressions.Expression<Func<Invoice, RecentInvoiceDto>> ProjectToRecentInvoice() =>
        i => new RecentInvoiceDto
        {
            Id = i.Id,
            InvoiceNumber = i.InvoiceNumber,
            PatientFullName = i.Patient!.FirstName + " " + i.Patient.LastName,
            IssueDate = i.IssueDate,
            TotalAmount = i.TotalAmount,
            PaidAmount = i.PaidAmount,
            RemainingAmount = i.RemainingAmount,
            Status = i.Status.ToString()
        };

    private static (DateOnly Start, DateOnly End) CurrentMonthRange(DateOnly today)
    {
        var start = new DateOnly(today.Year, today.Month, 1);
        return (start, start.AddMonths(1).AddDays(-1));
    }

    private static DateTime MonthStartUtc(DateOnly monthStart) =>
        DateTime.SpecifyKind(monthStart.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
}
