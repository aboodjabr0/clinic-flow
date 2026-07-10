using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class PatientsTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public PatientsTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Create_AsAdmin_ReturnsCreatedPatient()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Admin);
        var request = TestData.NewPatient();

        var response = await client.PostAsJsonAsync("/api/patients", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var patient = await response.ReadDataAsync<PatientDto>();
        Assert.Equal(request.FirstName, patient.FirstName);
        Assert.True(patient.IsActive);
    }

    [Fact]
    public async Task Create_AsReceptionist_Succeeds()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Receptionist);

        var response = await client.PostAsJsonAsync("/api/patients", TestData.NewPatient());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsDoctor_Returns403()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Doctor);

        var response = await client.PostAsJsonAsync("/api/patients", TestData.NewPatient());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task List_AsDoctor_Returns200()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        await TestData.CreatePatientAsync(admin);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.GetAsync("/api/patients");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.ReadDataAsync<PaginatedResponse<PatientListItemDto>>();
        Assert.True(page.TotalCount >= 1);
    }

    [Fact]
    public async Task Create_WithInvalidEmail_Returns400()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await client.PostAsJsonAsync("/api/patients", new
        {
            firstName = "Bad",
            lastName = "Email",
            phoneNumber = "0790000000",
            gender = "Male",
            email = "not-an-email"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.ReadErrorAsync();
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
    }

    [Fact]
    public async Task Create_WithMissingRequiredFields_Returns400()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await client.PostAsJsonAsync("/api/patients", new
        {
            lastName = "OnlyLastName"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
