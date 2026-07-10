using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.AuditLogs;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Visits;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class AuditLogsTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public AuditLogsTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SuccessfulLogin_CreatesAuditLogEntry()
    {
        // Uncached login so this test always produces its own entry.
        var client = _factory.CreateClient();
        await AuthHelper.LoginAsync(client, TestUsers.Receptionist.Email, TestUsers.Receptionist.Password);

        var logs = await QueryLogsAsync($"action=LoginSucceeded&search={TestUsers.Receptionist.Email}");

        Assert.Contains(logs.Items, log => log.UserEmail == TestUsers.Receptionist.Email);
    }

    [Fact]
    public async Task FailedLogin_CreatesAuditLogEntry()
    {
        var unknownEmail = $"nobody.{TestData.UniqueSuffix()}@clinicflow.test";
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = unknownEmail,
            password = "wrong-password-1!"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var logs = await QueryLogsAsync($"action=LoginFailed&search={unknownEmail}");

        Assert.Contains(logs.Items, log => log.UserEmail == unknownEmail);
    }

    [Fact]
    public async Task CreatingPatient_CreatesAuditLogEntry()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var logs = await QueryLogsAsync($"action=Created&entityType=Patient&search={patient.FirstName}");

        Assert.Contains(logs.Items, log => log.Summary.Contains(patient.FirstName));
    }

    [Fact]
    public async Task AddingPayment_CreatesAuditLogEntry()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id, subtotal: 100m);
        await TestData.AddPaymentAsync(admin, invoice.Id, 25m);

        var logs = await QueryLogsAsync($"action=PaymentAdded&entityType=Payment&search={invoice.InvoiceNumber}");

        Assert.Contains(logs.Items, log => log.Summary.Contains(invoice.InvoiceNumber));
    }

    [Fact]
    public async Task VisitAuditSummaries_DoNotContainClinicalNoteText()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);
        var visit = await TestData.StartVisitAsync(admin, graph.Appointment.Id);

        var marker = $"CONFIDENTIAL-{TestData.UniqueSuffix()}";
        var completeResponse = await admin.PatchAsJsonAsync(
            $"/api/visits/{visit.Id}/complete", new CompleteVisitDto
            {
                DiagnosisNote = $"{marker} diagnosis text",
                TreatmentNote = $"{marker} treatment text",
                PrescriptionNote = $"{marker} prescription text"
            });
        Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

        // The audit search scans summaries, user names/emails, and entity
        // display names — the clinical marker must not appear in any of them.
        var logs = await QueryLogsAsync($"search={marker}");

        Assert.Equal(0, logs.TotalCount);
    }

    private async Task<PaginatedResponse<AuditLogListItemDto>> QueryLogsAsync(string queryString)
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var response = await admin.GetAsync($"/api/audit-logs?pageSize=100&{queryString}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadDataAsync<PaginatedResponse<AuditLogListItemDto>>();
    }
}
