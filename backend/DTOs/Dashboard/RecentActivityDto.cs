namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>
/// Latest records across the clinic (doctor-scoped for Doctors).
/// RecentInvoices is empty for Doctor logins — financial visibility is
/// limited to Admin and Receptionist.
/// </summary>
public class RecentActivityDto
{
    public required List<RecentAppointmentDto> RecentAppointments { get; init; }
    public required List<RecentVisitDto> RecentVisits { get; init; }
    public required List<RecentInvoiceDto> RecentInvoices { get; init; }
}
