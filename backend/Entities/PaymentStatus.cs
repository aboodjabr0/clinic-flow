namespace ClinicFlow.Api.Entities;

/// <summary>
/// Payment state of an <see cref="Invoice"/>, derived from PaidAmount vs
/// TotalAmount. Refunded exists for manual bookkeeping only.
/// </summary>
public enum PaymentStatus
{
    Unpaid,
    PartiallyPaid,
    Paid,
    Refunded
}
