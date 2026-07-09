namespace ClinicFlow.Api.DTOs.DentalServices;

public class DentalServiceDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required decimal DefaultPrice { get; init; }
    public required int DurationMinutes { get; init; }
    public required bool IsActive { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
