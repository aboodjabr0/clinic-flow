using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Visits;

public class StartVisitDto
{
    [StringLength(500)]
    public string? ChiefComplaint { get; init; }
}
