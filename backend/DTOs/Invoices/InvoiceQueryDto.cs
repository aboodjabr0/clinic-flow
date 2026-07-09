namespace ClinicFlow.Api.DTOs.Invoices;

/// <summary>Bound from query string parameters on GET /api/invoices.</summary>
public class InvoiceQueryDto
{
    public string? Search { get; init; }
    public Guid? PatientId { get; init; }
    public Guid? AppointmentId { get; init; }
    public Guid? VisitId { get; init; }
    public string? Status { get; init; }
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}
