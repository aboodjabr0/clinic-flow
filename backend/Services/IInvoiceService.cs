using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Invoices;

namespace ClinicFlow.Api.Services;

public interface IInvoiceService
{
    Task<(PaginatedResponse<InvoiceListItemDto>? Result, string? Error)> GetInvoicesAsync(InvoiceQueryDto query);
    Task<InvoiceDto?> GetInvoiceByIdAsync(Guid id);
    Task<List<InvoiceListItemDto>> GetPatientInvoicesAsync(Guid patientId);
    Task<InvoiceDto?> GetInvoiceByAppointmentIdAsync(Guid appointmentId);
    Task<InvoiceDto?> GetInvoiceByVisitIdAsync(Guid visitId);
    Task<InvoiceStatsDto> GetInvoiceStatsAsync();
    Task<(InvoiceDto? Invoice, string? Error)> CreateInvoiceAsync(CreateInvoiceDto request);
    Task<(InvoiceDto? Invoice, string? Error, bool NotFound)> UpdateInvoiceAsync(Guid id, UpdateInvoiceDto request);
    Task<(InvoiceDto? Invoice, string? Error, bool NotFound)> AddPaymentAsync(Guid invoiceId, AddPaymentDto request, Guid? createdByUserId);
}
