namespace ClinicFlow.Api.DTOs.Invoices;

/// <summary>Lightweight projection for the invoices table/list.</summary>
public class InvoiceListItemDto
{
    public required Guid Id { get; init; }
    public required string InvoiceNumber { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }
    public Guid? AppointmentId { get; init; }
    public Guid? VisitId { get; init; }
    public string? ServiceName { get; init; }
    public required DateOnly IssueDate { get; init; }
    public DateOnly? DueDate { get; init; }
    public required decimal TotalAmount { get; init; }
    public required decimal PaidAmount { get; init; }
    public required decimal RemainingAmount { get; init; }
    public required string Status { get; init; }
}
