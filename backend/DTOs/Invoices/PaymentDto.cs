namespace ClinicFlow.Api.DTOs.Invoices;

public class PaymentDto
{
    public required Guid Id { get; init; }
    public required Guid InvoiceId { get; init; }
    public required decimal Amount { get; init; }
    public required DateOnly PaymentDate { get; init; }
    public required string Method { get; init; }
    public string? ReferenceNumber { get; init; }
    public string? Notes { get; init; }
    public string? CreatedByUserName { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
}
