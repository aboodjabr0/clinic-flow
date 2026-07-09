namespace ClinicFlow.Api.DTOs.Invoices;

public class InvoiceDto
{
    public required Guid Id { get; init; }
    public required string InvoiceNumber { get; init; }

    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }

    public Guid? AppointmentId { get; init; }
    public Guid? VisitId { get; init; }

    public Guid? DentalServiceId { get; init; }
    public string? ServiceName { get; init; }

    public required DateOnly IssueDate { get; init; }
    public DateOnly? DueDate { get; init; }

    public required decimal SubtotalAmount { get; init; }
    public required decimal DiscountAmount { get; init; }
    public required decimal TotalAmount { get; init; }
    public required decimal PaidAmount { get; init; }
    public required decimal RemainingAmount { get; init; }

    public required string Status { get; init; }
    public string? Notes { get; init; }

    public required List<PaymentDto> Payments { get; init; }

    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
