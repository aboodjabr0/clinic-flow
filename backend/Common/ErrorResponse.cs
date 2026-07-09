namespace ClinicFlow.Api.Common;

/// <summary>
/// Standard envelope for error responses. Never include exception details,
/// stack traces, or internal messages here — only safe, generic text.
/// </summary>
public class ErrorResponse
{
    public bool Success { get; init; } = false;
    public string Message { get; init; } = "An unexpected error occurred.";
    public string? TraceId { get; init; }
}
