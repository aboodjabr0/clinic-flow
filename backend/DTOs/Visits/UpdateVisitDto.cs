using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Visits;

public class UpdateVisitDto
{
    [StringLength(500)]
    public string? ChiefComplaint { get; init; }

    [StringLength(2000)]
    public string? DiagnosisNote { get; init; }

    [StringLength(2000)]
    public string? TreatmentNote { get; init; }

    [StringLength(200)]
    public string? ToothNumbers { get; init; }

    [StringLength(2000)]
    public string? PrescriptionNote { get; init; }

    public DateOnly? FollowUpDate { get; init; }

    [StringLength(2000)]
    public string? InternalNotes { get; init; }
}
