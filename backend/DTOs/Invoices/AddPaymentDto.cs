using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Invoices;

public class AddPaymentDto
{
    [Required]
    [Range(0.01, 99999999.99, ErrorMessage = "Payment amount must be greater than zero.")]
    public required decimal Amount { get; init; }

    [Required]
    public required DateOnly PaymentDate { get; init; }

    /// <summary>One of: Cash, Card, BankTransfer, CliQ, Other.</summary>
    [Required, StringLength(32)]
    public required string Method { get; init; }

    [StringLength(100)]
    public string? ReferenceNumber { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}
