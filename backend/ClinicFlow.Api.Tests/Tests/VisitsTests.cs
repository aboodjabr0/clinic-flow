using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.DTOs.Visits;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class VisitsTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public VisitsTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task StartVisit_AsAdmin_CreatesVisit_AndSetsAppointmentInProgress()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var visit = await TestData.StartVisitAsync(admin, graph.Appointment.Id);

        Assert.Equal("InProgress", visit.Status);
        Assert.Equal(graph.Appointment.Id, visit.AppointmentId);

        var appointmentResponse = await admin.GetAsync($"/api/appointments/{graph.Appointment.Id}");
        var appointment = await appointmentResponse.ReadDataAsync<AppointmentDto>();
        Assert.Equal("InProgress", appointment.Status);
    }

    [Fact]
    public async Task StartVisit_AsDoctor_OnOwnAppointment_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin, _factory.SeededDoctorProfileId);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.PostAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/visit/start", new StartVisitDto());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task StartVisit_AsDoctor_OnAnotherDoctorsAppointment_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.PostAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/visit/start", new StartVisitDto());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task StartVisit_AsReceptionist_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.PostAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/visit/start", new StartVisitDto());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task StartVisit_Twice_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        await TestData.StartVisitAsync(admin, graph.Appointment.Id);

        var response = await admin.PostAsJsonAsync(
            $"/api/appointments/{graph.Appointment.Id}/visit/start", new StartVisitDto());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.ReadErrorAsync();
        Assert.Contains("already been started", error.Message);
    }

    [Fact]
    public async Task CompleteVisit_SetsVisitAndAppointmentCompleted()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var visit = await TestData.StartVisitAsync(admin, graph.Appointment.Id);

        var response = await admin.PatchAsJsonAsync(
            $"/api/visits/{visit.Id}/complete", new CompleteVisitDto
            {
                DiagnosisNote = "Test diagnosis note",
                TreatmentNote = "Test treatment note"
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var completed = await response.ReadDataAsync<VisitDto>();
        Assert.Equal("Completed", completed.Status);
        Assert.NotNull(completed.CompletedAtUtc);

        var appointmentResponse = await admin.GetAsync($"/api/appointments/{graph.Appointment.Id}");
        var appointment = await appointmentResponse.ReadDataAsync<AppointmentDto>();
        Assert.Equal("Completed", appointment.Status);
    }

    [Fact]
    public async Task CompleteVisit_Twice_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var visit = await TestData.StartVisitAsync(admin, graph.Appointment.Id);
        var first = await admin.PatchAsJsonAsync($"/api/visits/{visit.Id}/complete", new CompleteVisitDto());
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await admin.PatchAsJsonAsync($"/api/visits/{visit.Id}/complete", new CompleteVisitDto());

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var error = await second.ReadErrorAsync();
        Assert.Contains("already been completed", error.Message);
    }
}
