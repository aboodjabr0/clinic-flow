using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Invoices;

/// <summary>
/// PatientId may be omitted when AppointmentId or VisitId is provided — the
/// patient is then resolved from the linked record. SubtotalAmount may be
/// omitted when a service can be resolved; it then defaults to that
/// service's default price.
/// </summary>
public class CreateInvoiceDto
{
    public Guid? PatientId { get; init; }
    public Guid? AppointmentId { get; init; }
    public Guid? VisitId { get; init; }
    public Guid? DentalServiceId { get; init; }

    [Range(0, 99999999.99)]
    public decimal? SubtotalAmount { get; init; }

    [Range(0, 99999999.99)]
    public decimal DiscountAmount { get; init; }

    public DateOnly? DueDate { get; init; }

    [StringLength(2000)]
    public string? Notes { get; init; }
}
