using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.AuditLogs;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class MedicalHistoryTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public MedicalHistoryTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static UpsertPatientMedicalHistoryDto NewHistory(string? allergies = "Penicillin") => new()
    {
        Allergies = allergies,
        ChronicDiseases = "Hypertension",
        CurrentMedications = "Aspirin 81mg daily",
        PregnancyStatus = "NotApplicable",
        SmokingStatus = "FormerSmoker",
        DiabetesStatus = "Yes",
        HeartDisease = true,
        BloodThinners = true,
        AnesthesiaSensitivity = false,
        MedicalAlerts = "Requires antibiotic prophylaxis",
        EmergencyContactName = "Test Contact",
        EmergencyContactPhone = "0791111111"
    };

    [Fact]
    public async Task Get_AsAnonymous_Returns401()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var anonymous = _factory.CreateClient();
        var response = await anonymous.GetAsync($"/api/patients/{patient.Id}/medical-history");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Upsert_AsAnonymous_Returns401()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var anonymous = _factory.CreateClient();
        var response = await anonymous.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", NewHistory());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Doctor")]
    [InlineData("Receptionist")]
    public async Task Get_AsAnyStaffRole_Returns200(string role)
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var user = role switch
        {
            "Admin" => TestUsers.Admin,
            "Doctor" => TestUsers.Doctor,
            _ => TestUsers.Receptionist
        };
        var client = await _factory.CreateClientForAsync(user);

        var response = await client.GetAsync($"/api/patients/{patient.Id}/medical-history");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await response.ReadDataAsync<PatientMedicalHistoryDto>();
        Assert.Equal(patient.Id, history.PatientId);
    }

    [Fact]
    public async Task Get_WhenNoHistoryExists_ReturnsEmptyDefaultDto()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var response = await admin.GetAsync($"/api/patients/{patient.Id}/medical-history");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await response.ReadDataAsync<PatientMedicalHistoryDto>();
        Assert.Null(history.LastUpdatedAtUtc);
        Assert.Null(history.Allergies);
        Assert.Equal("Unknown", history.PregnancyStatus);
        Assert.Equal("Unknown", history.SmokingStatus);
        Assert.Equal("Unknown", history.DiabetesStatus);
        Assert.False(history.HeartDisease);
    }

    [Fact]
    public async Task Get_ForNonexistentPatient_Returns404()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await admin.GetAsync($"/api/patients/{Guid.NewGuid()}/medical-history");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Upsert_AsAdmin_CreatesHistory()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", NewHistory());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await response.ReadDataAsync<PatientMedicalHistoryDto>();
        Assert.Equal("Penicillin", history.Allergies);
        Assert.Equal("Yes", history.DiabetesStatus);
        Assert.True(history.BloodThinners);
        Assert.NotNull(history.LastUpdatedAtUtc);
        Assert.Equal(TestUsers.Admin.FullName, history.LastUpdatedByUserName);
    }

    [Fact]
    public async Task Upsert_AsDoctor_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", NewHistory());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await response.ReadDataAsync<PatientMedicalHistoryDto>();
        Assert.Equal(TestUsers.Doctor.FullName, history.LastUpdatedByUserName);
    }

    [Fact]
    public async Task Upsert_AsReceptionist_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var response = await receptionist.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", NewHistory());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Upsert_ForNonexistentPatient_Returns404()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await admin.PutAsJsonAsync($"/api/patients/{Guid.NewGuid()}/medical-history", NewHistory());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Upsert_WithInvalidEnumValue_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", new
        {
            smokingStatus = "ChainSmoker"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upsert_WithOversizedText_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", new
        {
            allergies = new string('x', 1001)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upsert_Twice_UpdatesInsteadOfDuplicating()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var first = await admin.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", NewHistory("Penicillin"));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await admin.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", NewHistory("Latex"));
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var getResponse = await admin.GetAsync($"/api/patients/{patient.Id}/medical-history");
        var history = await getResponse.ReadDataAsync<PatientMedicalHistoryDto>();
        Assert.Equal("Latex", history.Allergies);

        // The second write must hit the existing record: exactly one Created
        // audit entry followed by one Updated entry, never two Created.
        var logs = await QueryLogsAsync(admin, $"entityType=PatientMedicalHistory&search={patient.FirstName}");
        var actions = logs.Items
            .Where(log => log.EntityDisplayName != null && log.EntityDisplayName.Contains(patient.FirstName))
            .Select(log => log.Action)
            .ToList();
        Assert.Single(actions, action => action == "Created");
        Assert.Single(actions, action => action == "Updated");
    }

    [Fact]
    public async Task Upsert_CreatesAuditLog_WithoutSensitiveMedicalText()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var marker = $"CONFIDENTIAL-{TestData.UniqueSuffix()}";
        var request = new UpsertPatientMedicalHistoryDto
        {
            Allergies = $"{marker} allergy text",
            ChronicDiseases = $"{marker} disease text",
            CurrentMedications = $"{marker} medication text",
            MedicalAlerts = $"{marker} alert text",
            PregnancyStatus = "Pregnant"
        };
        var response = await admin.PutAsJsonAsync($"/api/patients/{patient.Id}/medical-history", request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // An audit entry exists for the write...
        var created = await QueryLogsAsync(admin, $"action=Created&entityType=PatientMedicalHistory&search={patient.FirstName}");
        Assert.Contains(created.Items, log => log.Summary.Contains(patient.FirstName));

        // ...but the medical text never appears in any searchable audit field.
        var leaked = await QueryLogsAsync(admin, $"search={marker}");
        Assert.Equal(0, leaked.TotalCount);
    }

    private static async Task<PaginatedResponse<AuditLogListItemDto>> QueryLogsAsync(HttpClient admin, string queryString)
    {
        var response = await admin.GetAsync($"/api/audit-logs?pageSize=100&{queryString}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadDataAsync<PaginatedResponse<AuditLogListItemDto>>();
    }
}
