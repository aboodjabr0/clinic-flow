using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.DTOs.Common;

namespace ClinicFlow.Api.Services;

public interface IAppointmentService
{
    Task<(PaginatedResponse<AppointmentListItemDto>? Result, string? Error)> GetAppointmentsAsync(AppointmentQueryDto query);
    Task<List<AppointmentListItemDto>> GetTodayAppointmentsAsync();
    Task<AppointmentDto?> GetAppointmentByIdAsync(Guid id);
    Task<List<AppointmentListItemDto>> GetPatientAppointmentsAsync(Guid patientId);
    Task<AppointmentStatsDto> GetAppointmentStatsAsync();
    Task<(AppointmentDto? Appointment, string? Error)> CreateAppointmentAsync(CreateAppointmentDto request);
    Task<(AppointmentDto? Appointment, string? Error)> UpdateAppointmentAsync(Guid id, UpdateAppointmentDto request);
    Task<(AppointmentDto? Appointment, string? Error)> UpdateAppointmentStatusAsync(Guid id, string status);
    Task<(AppointmentDto? Appointment, string? Error)> CancelAppointmentAsync(Guid id, string? cancellationReason);
}
