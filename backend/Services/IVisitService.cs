using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Visits;

namespace ClinicFlow.Api.Services;

public interface IVisitService
{
    Task<(PaginatedResponse<VisitListItemDto>? Result, string? Error)> GetVisitsAsync(VisitQueryDto query);
    Task<VisitDto?> GetVisitByIdAsync(Guid id);
    Task<VisitDto?> GetVisitByAppointmentIdAsync(Guid appointmentId);
    Task<List<VisitListItemDto>> GetPatientVisitsAsync(Guid patientId);
    Task<VisitStatsDto> GetVisitStatsAsync();

    /// <summary>Resolves the DoctorProfile linked to a logged-in AppUser, if any.</summary>
    Task<Guid?> GetDoctorProfileIdForAppUserAsync(Guid appUserId);

    /// <summary>
    /// <paramref name="restrictToDoctorProfileId"/> is null for Admin (no
    /// restriction) or the caller's own DoctorProfileId for Doctor; the
    /// result's Forbidden flag is set when the target visit/appointment
    /// belongs to a different doctor.
    /// </summary>
    Task<(VisitDto? Visit, string? Error, bool Forbidden)> StartVisitAsync(Guid appointmentId, StartVisitDto request, Guid? restrictToDoctorProfileId);
    Task<(VisitDto? Visit, string? Error, bool Forbidden)> UpdateVisitAsync(Guid id, UpdateVisitDto request, Guid? restrictToDoctorProfileId);
    Task<(VisitDto? Visit, string? Error, bool Forbidden)> CompleteVisitAsync(Guid id, CompleteVisitDto request, Guid? restrictToDoctorProfileId);
}
