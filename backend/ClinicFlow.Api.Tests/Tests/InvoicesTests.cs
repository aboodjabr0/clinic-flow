using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Invoices;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class InvoicesTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public InvoicesTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Create_AsAdmin_ReturnsUnpaidInvoice()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id, subtotal: 100m);

        Assert.Equal("Unpaid", invoice.Status);
        Assert.Equal(100m, invoice.TotalAmount);
        Assert.Equal(100m, invoice.RemainingAmount);
        Assert.False(string.IsNullOrWhiteSpace(invoice.InvoiceNumber));
    }

    [Fact]
    public async Task Create_AsReceptionist_Succeeds()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var invoice = await TestData.CreateInvoiceAsync(receptionist, patient.Id);

        Assert.Equal("Unpaid", invoice.Status);
    }

    [Fact]
    public async Task Create_AsDoctor_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.PostAsJsonAsync("/api/invoices", new CreateInvoiceDto
        {
            PatientId = patient.Id,
            SubtotalAmount = 100m
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddPayment_AsDoctor_Returns403()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.PostAsJsonAsync($"/api/invoices/{invoice.Id}/payments", new AddPaymentDto
        {
            Amount = 10m,
            PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Method = "Cash"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddPayment_ExceedingRemainingBalance_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id, subtotal: 100m);

        var response = await admin.PostAsJsonAsync($"/api/invoices/{invoice.Id}/payments", new AddPaymentDto
        {
            Amount = 150m,
            PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Method = "Cash"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.ReadErrorAsync();
        Assert.Contains("remaining balance", error.Message);
    }

    [Fact]
    public async Task PartialPayment_AsReceptionist_SetsStatusPartiallyPaid()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id, subtotal: 100m);

        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);
        var updated = await TestData.AddPaymentAsync(receptionist, invoice.Id, 40m);

        Assert.Equal("PartiallyPaid", updated.Status);
        Assert.Equal(40m, updated.PaidAmount);
        Assert.Equal(60m, updated.RemainingAmount);
    }

    [Fact]
    public async Task FullPayment_SetsStatusPaid()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id, subtotal: 100m);

        await TestData.AddPaymentAsync(admin, invoice.Id, 40m);
        var updated = await TestData.AddPaymentAsync(admin, invoice.Id, 60m);

        Assert.Equal("Paid", updated.Status);
        Assert.Equal(100m, updated.PaidAmount);
        Assert.Equal(0m, updated.RemainingAmount);
    }

    [Fact]
    public async Task GetById_LinkedToAppointment_IncludesDoctorFullName()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var graph = await TestData.CreateAppointmentGraphAsync(admin);

        var response = await admin.PostAsJsonAsync("/api/invoices", new CreateInvoiceDto
        {
            AppointmentId = graph.Appointment.Id,
            SubtotalAmount = 100m
        });
        response.EnsureSuccessStatusCode();
        var invoice = await response.ReadDataAsync<InvoiceDto>();

        Assert.NotNull(invoice.DoctorFullName);
        Assert.StartsWith("Dr. Test", invoice.DoctorFullName);
    }

    [Fact]
    public async Task GetById_NotLinkedToAppointmentOrVisit_DoctorFullNameIsNull()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id);

        Assert.Null(invoice.DoctorFullName);
    }

    [Fact]
    public async Task GetById_AsDoctor_CanViewFullFinancialDetails()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var patient = await TestData.CreatePatientAsync(admin);
        var invoice = await TestData.CreateInvoiceAsync(admin, patient.Id, subtotal: 100m);
        await TestData.AddPaymentAsync(admin, invoice.Id, 40m);

        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);
        var response = await doctor.GetAsync($"/api/invoices/{invoice.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var fetched = await response.ReadDataAsync<InvoiceDto>();
        Assert.Equal(40m, fetched.PaidAmount);
        Assert.Single(fetched.Payments);
    }
}
