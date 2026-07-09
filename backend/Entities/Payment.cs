namespace ClinicFlow.Api.Entities;

/// <summary>
/// A single payment recorded against an invoice. Payments are immutable after
/// creation for MVP — corrections are handled by recording another payment,
/// not by editing history.
/// </summary>
public class Payment
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public PaymentMethod Method { get; set; }

    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }

    public Guid? CreatedByUserId { get; set; }
    public AppUser? CreatedByUser { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
