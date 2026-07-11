using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class AppointmentsCalendarTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public AppointmentsCalendarTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static string CalendarUrl(DateOnly start, DateOnly end, Guid? doctorId = null, string? status = null)
    {
        var url = $"/api/appointments/calendar?startDate={start:yyyy-MM-dd}&endDate={end:yyyy-MM-dd}";
        if (doctorId.HasValue)
        {
            url += $"&doctorId={doctorId.Value}";
        }
        if (status is not null)
        {
            url += $"&status={status}";
        }
        return url;
    }

    [Fact]
    public async Task GetCalendar_Anonymous_Returns401()
    {
        var client = _factory.CreateClient();
        var start = TestData.FutureDate();

        var response = await client.GetAsync(CalendarUrl(start, start.AddDays(1)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCalendar_AsAdmin_ReturnsAppointmentsInRange()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var date = graph.Appointment.AppointmentDate;

        var response = await admin.GetAsync(CalendarUrl(date, date));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.Contains(items, a => a.Id == graph.Appointment.Id);
    }

    [Fact]
    public async Task GetCalendar_AsAdmin_IncludesPatientPhoneNumber()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var date = graph.Appointment.AppointmentDate;

        var response = await admin.GetAsync(CalendarUrl(date, date));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        var calendarAppointment = Assert.Single(items, a => a.Id == graph.Appointment.Id);
        Assert.Equal(graph.Patient.PhoneNumber, calendarAppointment.PatientPhoneNumber);
    }

    [Fact]
    public async Task GetCalendar_AsReceptionist_ReturnsAppointmentsInRange()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var date = graph.Appointment.AppointmentDate;

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.GetAsync(CalendarUrl(date, date));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.Contains(items, a => a.Id == graph.Appointment.Id);
    }

    /// <summary>
    /// Builds an appointment for the seeded Doctor test user's own profile at
    /// a caller-specified time, avoiding overlap conflicts with other tests
    /// that also book the shared seeded doctor on the same default date.
    /// </summary>
    private async Task<AppointmentDto> CreateOwnDoctorAppointmentAsync(HttpClient admin, DateOnly date, string startTime, string endTime)
    {
        var patient = await TestData.CreatePatientAsync(admin);
        var service = await TestData.CreateDentalServiceAsync(admin);
        return await TestData.CreateAppointmentAsync(
            admin, patient.Id, _factory.SeededDoctorProfileId, service.Id, date, startTime, endTime);
    }

    [Fact]
    public async Task GetCalendar_AsDoctor_OnlySeesOwnAppointments()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();

        var ownAppointment = await CreateOwnDoctorAppointmentAsync(admin, date, "10:00", "10:30");
        var otherGraph = await TestData.CreateAppointmentGraphAsync(admin);

        var doctorClient = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctorClient.GetAsync(CalendarUrl(date, date));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.Contains(items, a => a.Id == ownAppointment.Id);
        Assert.DoesNotContain(items, a => a.Id == otherGraph.Appointment.Id);
    }

    [Fact]
    public async Task GetCalendar_AsDoctor_DoctorIdQueryParamIsIgnored()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();

        var ownAppointment = await CreateOwnDoctorAppointmentAsync(admin, date, "11:00", "11:30");
        var otherGraph = await TestData.CreateAppointmentGraphAsync(admin);

        var doctorClient = await _factory.CreateClientForAsync(TestUsers.Doctor);
        // Doctor explicitly asks for the OTHER doctor's schedule via doctorId.
        var response = await doctorClient.GetAsync(CalendarUrl(date, date, doctorId: otherGraph.DoctorProfileId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.DoesNotContain(items, a => a.Id == otherGraph.Appointment.Id);
        Assert.Contains(items, a => a.Id == ownAppointment.Id);
    }

    [Fact]
    public async Task GetCalendar_DoctorIdFilter_WorksForAdmin()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();

        var graphA = await TestData.CreateAppointmentGraphAsync(admin);
        var graphB = await TestData.CreateAppointmentGraphAsync(admin);

        var response = await admin.GetAsync(CalendarUrl(date, date, doctorId: graphA.DoctorProfileId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.Contains(items, a => a.Id == graphA.Appointment.Id);
        Assert.DoesNotContain(items, a => a.Id == graphB.Appointment.Id);
    }

    [Fact]
    public async Task GetCalendar_StatusFilter_ExcludesOtherStatuses()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var response = await admin.GetAsync(CalendarUrl(date, date, status: "Completed"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.DoesNotContain(items, a => a.Id == graph.Appointment.Id);
    }

    [Fact]
    public async Task GetCalendar_DateRangeFilter_ExcludesAppointmentsOutsideRange()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var outsideStart = graph.Appointment.AppointmentDate.AddDays(1);
        var outsideEnd = graph.Appointment.AppointmentDate.AddDays(2);

        var response = await admin.GetAsync(CalendarUrl(outsideStart, outsideEnd));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.ReadDataAsync<List<CalendarAppointmentDto>>();
        Assert.DoesNotContain(items, a => a.Id == graph.Appointment.Id);
    }

    [Fact]
    public async Task GetCalendar_MissingDateRange_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await admin.GetAsync("/api/appointments/calendar");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetCalendar_EndDateBeforeStartDate_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();

        var response = await admin.GetAsync(CalendarUrl(date, date.AddDays(-1)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
