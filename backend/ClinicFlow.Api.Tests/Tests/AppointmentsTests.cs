using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class AppointmentsTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public AppointmentsTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
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
    public async Task Create_AsReceptionist_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var doctor = await TestData.CreateDoctorProfileAsync(admin);
        var service = await TestData.CreateDentalServiceAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.PostAsJsonAsync("/api/appointments",
            TestData.NewAppointment(patient.Id, doctor.Id, service.Id));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var appointment = await response.ReadDataAsync<AppointmentDto>();
        Assert.Equal("Scheduled", appointment.Status);
    }

    [Fact]
    public async Task Create_AsAdmin_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        Assert.Equal("Scheduled", graph.Appointment.Status);
    }

    [Fact]
    public async Task Create_AsDoctor_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var doctor = await TestData.CreateDoctorProfileAsync(admin);
        var service = await TestData.CreateDentalServiceAsync(admin);

        var doctorClient = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctorClient.PostAsJsonAsync("/api/appointments",
            TestData.NewAppointment(patient.Id, doctor.Id, service.Id));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_OverlappingSameDoctor_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var overlapping = TestData.NewAppointment(
            graph.Patient.Id, graph.DoctorProfileId, graph.Service.Id,
            startTime: "09:15", endTime: "09:45");
        var response = await admin.PostAsJsonAsync("/api/appointments", overlapping);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.ReadErrorAsync();
        Assert.Contains("overlaps", error.Message);
    }

    [Fact]
    public async Task Create_OverlappingTime_ForDifferentDoctor_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var otherDoctor = await TestData.CreateDoctorProfileAsync(admin);

        var response = await admin.PostAsJsonAsync("/api/appointments",
            TestData.NewAppointment(
                graph.Patient.Id, otherDoctor.Id, graph.Service.Id,
                startTime: "09:15", endTime: "09:45"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_AsReceptionist_ToArrived_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.PatchAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/status", new { status = "Arrived" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var appointment = await response.ReadDataAsync<AppointmentDto>();
        Assert.Equal("Arrived", appointment.Status);
    }

    [Fact]
    public async Task UpdateStatus_AsReceptionist_ToCompleted_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.PatchAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/status", new { status = "Completed" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_AsDoctor_ToCancelled_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.PatchAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/status", new { status = "Cancelled" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_AsDoctor_OnlyReturnsOwnAppointments()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();

        var ownAppointment = await CreateOwnDoctorAppointmentAsync(admin, date, "16:00", "16:30");
        var otherGraph = await TestData.CreateAppointmentGraphAsync(admin);

        var doctorClient = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctorClient.GetAsync("/api/appointments?pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.ReadDataAsync<PaginatedResponse<AppointmentListItemDto>>();
        Assert.Contains(result.Items, a => a.Id == ownAppointment.Id);
        Assert.DoesNotContain(result.Items, a => a.Id == otherGraph.Appointment.Id);
    }

    [Fact]
    public async Task GetAll_AsDoctor_DoctorIdQueryParamCannotExposeAnotherDoctor()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var date = TestData.FutureDate();

        var ownAppointment = await CreateOwnDoctorAppointmentAsync(admin, date, "17:00", "17:30");
        var otherGraph = await TestData.CreateAppointmentGraphAsync(admin);

        var doctorClient = await _factory.CreateClientForAsync(TestUsers.Doctor);
        // Doctor explicitly asks for the OTHER doctor's appointments via doctorId.
        var response = await doctorClient.GetAsync($"/api/appointments?doctorId={otherGraph.DoctorProfileId}&pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.ReadDataAsync<PaginatedResponse<AppointmentListItemDto>>();
        Assert.DoesNotContain(result.Items, a => a.Id == otherGraph.Appointment.Id);
        Assert.Contains(result.Items, a => a.Id == ownAppointment.Id);
    }

    [Fact]
    public async Task GetAll_AsAdmin_DoctorIdFilterWorks()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graphA = await TestData.CreateAppointmentGraphAsync(admin);
        var graphB = await TestData.CreateAppointmentGraphAsync(admin);

        var response = await admin.GetAsync($"/api/appointments?doctorId={graphA.DoctorProfileId}&pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.ReadDataAsync<PaginatedResponse<AppointmentListItemDto>>();
        Assert.Contains(result.Items, a => a.Id == graphA.Appointment.Id);
        Assert.DoesNotContain(result.Items, a => a.Id == graphB.Appointment.Id);
    }

    [Fact]
    public async Task GetAll_AsReceptionist_DoctorIdFilterWorks()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graphA = await TestData.CreateAppointmentGraphAsync(admin);
        var graphB = await TestData.CreateAppointmentGraphAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.GetAsync($"/api/appointments?doctorId={graphA.DoctorProfileId}&pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.ReadDataAsync<PaginatedResponse<AppointmentListItemDto>>();
        Assert.Contains(result.Items, a => a.Id == graphA.Appointment.Id);
        Assert.DoesNotContain(result.Items, a => a.Id == graphB.Appointment.Id);
    }
}
