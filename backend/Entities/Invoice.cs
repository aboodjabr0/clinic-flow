namespace ClinicFlow.Api.Entities;

/// <summary>
/// A bill issued to a patient, optionally linked to the appointment and/or
/// visit it covers. Money fields are denormalized: TotalAmount =
/// SubtotalAmount - DiscountAmount, RemainingAmount = TotalAmount -
/// PaidAmount, and Status is derived from PaidAmount vs TotalAmount. All of
/// them are recalculated by InvoiceService whenever a payment is added or the
/// discount changes — never written directly by controllers.
/// </summary>
public class Invoice
{
    public Guid Id { get; set; }

    /// <summary>Human-facing unique number, e.g. "INV-2026-0001".</summary>
    public required string InvoiceNumber { get; set; }

    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }

    public Guid? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public Guid? VisitId { get; set; }
    public Visit? Visit { get; set; }

    /// <summary>The service this invoice bills for, kept for price reference.</summary>
    public Guid? DentalServiceId { get; set; }
    public DentalService? DentalService { get; set; }

    public DateOnly IssueDate { get; set; }
    public DateOnly? DueDate { get; set; }

    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Unpaid;

    public string? Notes { get; set; }

    public List<Payment> Payments { get; set; } = [];

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
