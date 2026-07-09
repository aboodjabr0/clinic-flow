using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Invoices;

/// <summary>
/// Notes and DueDate are always updatable. DiscountAmount may only change
/// while the invoice has no payments; pass null to leave it unchanged.
/// </summary>
public class UpdateInvoiceDto
{
    [Range(0, 99999999.99)]
    public decimal? DiscountAmount { get; init; }

    public DateOnly? DueDate { get; init; }

    [StringLength(2000)]
    public string? Notes { get; init; }
}
