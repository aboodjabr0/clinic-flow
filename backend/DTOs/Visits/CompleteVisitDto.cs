namespace ClinicFlow.Api.DTOs.Visits;

/// <summary>
/// Same optional note fields as <see cref="UpdateVisitDto"/> so a doctor can
/// finalize notes and complete the visit in a single request.
/// </summary>
public class CompleteVisitDto : UpdateVisitDto
{
}
