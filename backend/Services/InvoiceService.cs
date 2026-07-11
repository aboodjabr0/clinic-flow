using System.Linq.Expressions;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Invoices;
using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

public class InvoiceService : IInvoiceService
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public InvoiceService(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Flat, server-translatable projection carrying display data pulled in
    /// via joins to Patient/DentalService. Mirrors the VisitRow pattern in
    /// VisitService. Payments are loaded separately for the detail DTO.
    /// </summary>
    private record InvoiceRow(
        Guid Id,
        string InvoiceNumber,
        Guid PatientId,
        string PatientFullName,
        string PatientPhoneNumber,
        Guid? AppointmentId,
        Guid? VisitId,
        Guid? DentalServiceId,
        string? ServiceName,
        string? DoctorFullName,
        DateOnly IssueDate,
        DateOnly? DueDate,
        decimal SubtotalAmount,
        decimal DiscountAmount,
        decimal TotalAmount,
        decimal PaidAmount,
        decimal RemainingAmount,
        PaymentStatus Status,
        string? Notes,
        DateTime CreatedAtUtc,
        DateTime? UpdatedAtUtc);

    private static readonly Expression<Func<Invoice, InvoiceRow>> ProjectToRow = i => new InvoiceRow(
        i.Id,
        i.InvoiceNumber,
        i.PatientId,
        i.Patient!.FirstName + " " + i.Patient.LastName,
        i.Patient.PhoneNumber,
        i.AppointmentId,
        i.VisitId,
        i.DentalServiceId,
        i.DentalService != null ? i.DentalService.Name : null,
        i.Visit != null ? i.Visit.DoctorProfile!.FullName
            : i.Appointment != null ? i.Appointment.DoctorProfile!.FullName : null,
        i.IssueDate,
        i.DueDate,
        i.SubtotalAmount,
        i.DiscountAmount,
        i.TotalAmount,
        i.PaidAmount,
        i.RemainingAmount,
        i.Status,
        i.Notes,
        i.CreatedAtUtc,
        i.UpdatedAtUtc);

    public async Task<(PaginatedResponse<InvoiceListItemDto>? Result, string? Error)> GetInvoicesAsync(InvoiceQueryDto query)
    {
        PaymentStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<PaymentStatus>(query.Status, ignoreCase: true, out var parsedStatus))
            {
                return (null, "Invalid status filter.");
            }
            statusFilter = parsedStatus;
        }

        var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize < 1 ? 10 : Math.Min(query.PageSize, MaxPageSize);

        var invoices = _context.Invoices.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            invoices = invoices.Where(i =>
                i.InvoiceNumber.ToLower().Contains(search) ||
                (i.Patient!.FirstName + " " + i.Patient.LastName).ToLower().Contains(search) ||
                i.Patient.PhoneNumber.ToLower().Contains(search) ||
                (i.DentalService != null && i.DentalService.Name.ToLower().Contains(search)));
        }

        if (query.PatientId.HasValue)
        {
            invoices = invoices.Where(i => i.PatientId == query.PatientId.Value);
        }

        if (query.AppointmentId.HasValue)
        {
            invoices = invoices.Where(i => i.AppointmentId == query.AppointmentId.Value);
        }

        if (query.VisitId.HasValue)
        {
            invoices = invoices.Where(i => i.VisitId == query.VisitId.Value);
        }

        if (query.FromDate.HasValue)
        {
            invoices = invoices.Where(i => i.IssueDate >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            invoices = invoices.Where(i => i.IssueDate <= query.ToDate.Value);
        }

        if (statusFilter.HasValue)
        {
            invoices = invoices.Where(i => i.Status == statusFilter.Value);
        }

        var totalCount = await invoices.CountAsync();

        var rows = await invoices
            .OrderByDescending(i => i.IssueDate)
            .ThenByDescending(i => i.InvoiceNumber)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(ProjectToRow)
            .ToListAsync();

        var result = new PaginatedResponse<InvoiceListItemDto>
        {
            Items = rows.Select(ToListItemDto).ToList(),
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return (result, null);
    }

    public Task<InvoiceDto?> GetInvoiceByIdAsync(Guid id) =>
        GetInvoiceDtoAsync(i => i.Id == id);

    public Task<InvoiceDto?> GetInvoiceByAppointmentIdAsync(Guid appointmentId) =>
        GetInvoiceDtoAsync(i => i.AppointmentId == appointmentId);

    public Task<InvoiceDto?> GetInvoiceByVisitIdAsync(Guid visitId) =>
        GetInvoiceDtoAsync(i => i.VisitId == visitId);

    private async Task<InvoiceDto?> GetInvoiceDtoAsync(Expression<Func<Invoice, bool>> predicate)
    {
        var row = await _context.Invoices
            .Where(predicate)
            .Select(ProjectToRow)
            .FirstOrDefaultAsync();

        if (row is null)
        {
            return null;
        }

        var payments = await _context.Payments
            .Where(p => p.InvoiceId == row.Id)
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.CreatedAtUtc)
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                InvoiceId = p.InvoiceId,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate,
                Method = p.Method.ToString(),
                ReferenceNumber = p.ReferenceNumber,
                Notes = p.Notes,
                CreatedByUserName = p.CreatedByUser != null ? p.CreatedByUser.FullName : null,
                CreatedAtUtc = p.CreatedAtUtc
            })
            .ToListAsync();

        return ToDto(row, payments);
    }

    public async Task<List<InvoiceListItemDto>> GetPatientInvoicesAsync(Guid patientId)
    {
        var rows = await _context.Invoices
            .Where(i => i.PatientId == patientId)
            .OrderByDescending(i => i.IssueDate)
            .ThenByDescending(i => i.InvoiceNumber)
            .Select(ProjectToRow)
            .ToListAsync();

        return rows.Select(ToListItemDto).ToList();
    }

    public async Task<InvoiceStatsDto> GetInvoiceStatsAsync()
    {
        var totalInvoices = await _context.Invoices.CountAsync();
        var unpaidInvoices = await _context.Invoices.CountAsync(i => i.Status == PaymentStatus.Unpaid);
        var partiallyPaidInvoices = await _context.Invoices.CountAsync(i => i.Status == PaymentStatus.PartiallyPaid);
        var paidInvoices = await _context.Invoices.CountAsync(i => i.Status == PaymentStatus.Paid);
        var totalRevenue = await _context.Invoices.SumAsync(i => (decimal?)i.PaidAmount) ?? 0m;
        var outstandingBalance = await _context.Invoices.SumAsync(i => (decimal?)i.RemainingAmount) ?? 0m;

        return new InvoiceStatsDto
        {
            TotalInvoices = totalInvoices,
            UnpaidInvoices = unpaidInvoices,
            PartiallyPaidInvoices = partiallyPaidInvoices,
            PaidInvoices = paidInvoices,
            TotalRevenue = totalRevenue,
            OutstandingBalance = outstandingBalance
        };
    }

    public async Task<(InvoiceDto? Invoice, string? Error)> CreateInvoiceAsync(CreateInvoiceDto request)
    {
        Guid patientId;
        Guid? appointmentId = request.AppointmentId;
        Guid? visitId = request.VisitId;
        Guid? dentalServiceId = request.DentalServiceId;

        if (visitId.HasValue)
        {
            var visit = await _context.Visits
                .Include(v => v.Appointment)
                .FirstOrDefaultAsync(v => v.Id == visitId.Value);
            if (visit is null)
            {
                return (null, "Visit not found.");
            }

            if (appointmentId.HasValue && appointmentId.Value != visit.AppointmentId)
            {
                return (null, "The appointment does not match the linked visit.");
            }

            patientId = visit.PatientId;
            appointmentId = visit.AppointmentId;
            dentalServiceId ??= visit.Appointment!.DentalServiceId;
        }
        else if (appointmentId.HasValue)
        {
            var appointment = await _context.Appointments.FindAsync(appointmentId.Value);
            if (appointment is null)
            {
                return (null, "Appointment not found.");
            }

            patientId = appointment.PatientId;
            dentalServiceId ??= appointment.DentalServiceId;
        }
        else
        {
            if (!request.PatientId.HasValue)
            {
                return (null, "A patient is required when no appointment or visit is linked.");
            }

            var patientExists = await _context.Patients.AnyAsync(p => p.Id == request.PatientId.Value);
            if (!patientExists)
            {
                return (null, "Patient not found.");
            }

            patientId = request.PatientId.Value;
        }

        if (request.PatientId.HasValue && request.PatientId.Value != patientId)
        {
            return (null, "The patient does not match the linked appointment or visit.");
        }

        if (appointmentId.HasValue && await _context.Invoices.AnyAsync(i => i.AppointmentId == appointmentId.Value))
        {
            return (null, "An invoice already exists for this appointment.");
        }

        if (visitId.HasValue && await _context.Invoices.AnyAsync(i => i.VisitId == visitId.Value))
        {
            return (null, "An invoice already exists for this visit.");
        }

        DentalService? service = null;
        if (dentalServiceId.HasValue)
        {
            service = await _context.DentalServices.FindAsync(dentalServiceId.Value);
            if (service is null)
            {
                return (null, "Dental service not found.");
            }
        }

        var subtotal = request.SubtotalAmount ?? service?.DefaultPrice;
        if (subtotal is null)
        {
            return (null, "A subtotal amount is required when no service is linked.");
        }

        if (request.DiscountAmount < 0)
        {
            return (null, "Discount cannot be negative.");
        }

        var total = subtotal.Value - request.DiscountAmount;
        if (total < 0)
        {
            return (null, "Discount cannot exceed the subtotal amount.");
        }

        var issueDate = DateOnly.FromDateTime(DateTime.UtcNow);
        if (request.DueDate.HasValue && request.DueDate.Value < issueDate)
        {
            return (null, "Due date cannot be before the issue date.");
        }

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = await GenerateInvoiceNumberAsync(),
            PatientId = patientId,
            AppointmentId = appointmentId,
            VisitId = visitId,
            DentalServiceId = dentalServiceId,
            IssueDate = issueDate,
            DueDate = request.DueDate,
            SubtotalAmount = subtotal.Value,
            DiscountAmount = request.DiscountAmount,
            TotalAmount = total,
            PaidAmount = 0m,
            RemainingAmount = total,
            Status = PaymentStatus.Unpaid,
            Notes = NormalizeOptional(request.Notes),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        var created = await GetInvoiceByIdAsync(invoice.Id);
        await _auditLogService.LogAsync(
            AuditActions.InvoiceCreated,
            AuditEntityTypes.Invoice,
            invoice.Id,
            invoice.InvoiceNumber,
            $"Invoice {invoice.InvoiceNumber} created for patient {created?.PatientFullName}, total {invoice.TotalAmount:0.00}");

        return (created, null);
    }

    public async Task<(InvoiceDto? Invoice, string? Error, bool NotFound)> UpdateInvoiceAsync(Guid id, UpdateInvoiceDto request)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice is null)
        {
            return (null, null, true);
        }

        if (request.DueDate.HasValue && request.DueDate.Value < invoice.IssueDate)
        {
            return (null, "Due date cannot be before the issue date.", false);
        }

        if (request.DiscountAmount.HasValue && request.DiscountAmount.Value != invoice.DiscountAmount)
        {
            var hasPayments = invoice.PaidAmount > 0 || await _context.Payments.AnyAsync(p => p.InvoiceId == id);
            if (hasPayments)
            {
                return (null, "The discount cannot be changed after payments have been recorded.", false);
            }

            var total = invoice.SubtotalAmount - request.DiscountAmount.Value;
            if (total < 0)
            {
                return (null, "Discount cannot exceed the subtotal amount.", false);
            }

            invoice.DiscountAmount = request.DiscountAmount.Value;
            invoice.TotalAmount = total;
            invoice.RemainingAmount = total;
        }

        invoice.DueDate = request.DueDate;
        invoice.Notes = NormalizeOptional(request.Notes);
        invoice.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.Updated,
            AuditEntityTypes.Invoice,
            invoice.Id,
            invoice.InvoiceNumber,
            $"Invoice {invoice.InvoiceNumber} updated");

        return (await GetInvoiceByIdAsync(id), null, false);
    }

    public async Task<(InvoiceDto? Invoice, string? Error, bool NotFound)> AddPaymentAsync(Guid invoiceId, AddPaymentDto request, Guid? createdByUserId)
    {
        var invoice = await _context.Invoices.FindAsync(invoiceId);
        if (invoice is null)
        {
            return (null, null, true);
        }

        if (!Enum.TryParse<PaymentMethod>(request.Method, ignoreCase: true, out var method))
        {
            return (null, "Invalid payment method.", false);
        }

        if (request.Amount <= 0)
        {
            return (null, "Payment amount must be greater than zero.", false);
        }

        if (request.Amount > invoice.RemainingAmount)
        {
            return (null, "Payment amount cannot exceed the remaining balance.", false);
        }

        var now = DateTime.UtcNow;
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            PaymentDate = request.PaymentDate,
            Method = method,
            ReferenceNumber = NormalizeOptional(request.ReferenceNumber),
            Notes = NormalizeOptional(request.Notes),
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = now
        };

        invoice.PaidAmount += request.Amount;
        invoice.RemainingAmount = invoice.TotalAmount - invoice.PaidAmount;
        invoice.Status = invoice.PaidAmount >= invoice.TotalAmount
            ? PaymentStatus.Paid
            : PaymentStatus.PartiallyPaid;
        invoice.UpdatedAtUtc = now;

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync(
            AuditActions.PaymentAdded,
            AuditEntityTypes.Payment,
            payment.Id,
            invoice.InvoiceNumber,
            $"Payment of {payment.Amount:0.00} added to invoice {invoice.InvoiceNumber}");

        return (await GetInvoiceByIdAsync(invoiceId), null, false);
    }

    /// <summary>
    /// Generates the next "INV-{year}-{0000}" number by reading the highest
    /// existing number for the current year. Deliberately simple for a
    /// single-instance MVP — the unique index on InvoiceNumber is the
    /// backstop against a race between two concurrent creates.
    /// </summary>
    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var prefix = $"INV-{DateTime.UtcNow.Year}-";

        var lastNumber = await _context.Invoices
            .Where(i => i.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(i => i.InvoiceNumber)
            .Select(i => i.InvoiceNumber)
            .FirstOrDefaultAsync();

        var nextSequence = 1;
        if (lastNumber is not null && int.TryParse(lastNumber[prefix.Length..], out var lastSequence))
        {
            nextSequence = lastSequence + 1;
        }

        return $"{prefix}{nextSequence:D4}";
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static InvoiceDto ToDto(InvoiceRow row, List<PaymentDto> payments) => new()
    {
        Id = row.Id,
        InvoiceNumber = row.InvoiceNumber,
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        PatientPhoneNumber = row.PatientPhoneNumber,
        AppointmentId = row.AppointmentId,
        VisitId = row.VisitId,
        DentalServiceId = row.DentalServiceId,
        ServiceName = row.ServiceName,
        DoctorFullName = row.DoctorFullName,
        IssueDate = row.IssueDate,
        DueDate = row.DueDate,
        SubtotalAmount = row.SubtotalAmount,
        DiscountAmount = row.DiscountAmount,
        TotalAmount = row.TotalAmount,
        PaidAmount = row.PaidAmount,
        RemainingAmount = row.RemainingAmount,
        Status = row.Status.ToString(),
        Notes = row.Notes,
        Payments = payments,
        CreatedAtUtc = row.CreatedAtUtc,
        UpdatedAtUtc = row.UpdatedAtUtc
    };

    private static InvoiceListItemDto ToListItemDto(InvoiceRow row) => new()
    {
        Id = row.Id,
        InvoiceNumber = row.InvoiceNumber,
        PatientId = row.PatientId,
        PatientFullName = row.PatientFullName,
        PatientPhoneNumber = row.PatientPhoneNumber,
        AppointmentId = row.AppointmentId,
        VisitId = row.VisitId,
        ServiceName = row.ServiceName,
        IssueDate = row.IssueDate,
        DueDate = row.DueDate,
        TotalAmount = row.TotalAmount,
        PaidAmount = row.PaidAmount,
        RemainingAmount = row.RemainingAmount,
        Status = row.Status.ToString()
    };
}
