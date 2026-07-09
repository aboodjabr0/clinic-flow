namespace ClinicFlow.Api.DTOs;

public class HealthResponseDto
{
    public required string Status { get; init; }
    public required string AppName { get; init; }
    public required string Environment { get; init; }
    public required DateTime UtcTime { get; init; }
}
