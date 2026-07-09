using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.DentalServices;

public class UpdateDentalServiceDto
{
    [Required, StringLength(150)]
    public required string Name { get; init; }

    [StringLength(1000)]
    public string? Description { get; init; }

    [Range(0, 100000)]
    public required decimal DefaultPrice { get; init; }

    [Range(1, 600)]
    public required int DurationMinutes { get; init; }
}
