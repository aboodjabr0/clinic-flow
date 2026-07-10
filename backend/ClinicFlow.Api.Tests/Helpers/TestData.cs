using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Appointments;
using ClinicFlow.Api.DTOs.DentalServices;
using ClinicFlow.Api.DTOs.Doctors;
using ClinicFlow.Api.DTOs.Invoices;
using ClinicFlow.Api.DTOs.Patients;
using ClinicFlow.Api.DTOs.Visits;

namespace ClinicFlow.Api.Tests.Helpers;

/// <summary>
/// Creates test records through the real API endpoints (using an
/// Admin-authenticated client) so tests exercise the same code paths users
/// hit. All names/emails carry a random suffix so tests stay independent of
/// each other and of execution order.
/// </summary>
public static class TestData
{
    /// <summary>A future date safe against "date in the past" validation.</summary>
    public static DateOnly FutureDate(int daysFromNow = 3) =>
        DateOnly.FromDateTime(DateTime.UtcNow).AddDays(daysFromNow);

    public static string UniqueSuffix() => Guid.NewGuid().ToString("N")[..8];

    public static CreatePatientDto NewPatient(string? email = null)
    {
        var suffix = UniqueSuffix();
        return new CreatePatientDto
        {
            FirstName = $"Pat{suffix}",
            LastName = "Testcase",
            PhoneNumber = "0790000000",
            Email = email ?? $"patient.{suffix}@clinicflow.test",
            Gender = "Female"
        };
    }

    public static async Task<PatientDto> CreatePatientAsync(HttpClient adminClient)
    {
        var response = await adminClient.PostAsJsonAsync("/api/patients", NewPatient());
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<PatientDto>();
    }

    public static async Task<DoctorDto> CreateDoctorProfileAsync(HttpClient adminClient)
    {
        var suffix = UniqueSuffix();
        var request = new CreateDoctorDto
        {
            FullName = $"Dr. Test {suffix}",
            Email = $"dr.{suffix}@clinicflow.test",
            Specialty = "General Dentistry"
        };

        var response = await adminClient.PostAsJsonAsync("/api/doctors", request);
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<DoctorDto>();
    }

    public static async Task<DentalServiceDto> CreateDentalServiceAsync(HttpClient adminClient, decimal price = 50m)
    {
        var request = new CreateDentalServiceDto
        {
            Name = $"Test Service {UniqueSuffix()}",
            DefaultPrice = price,
            DurationMinutes = 30
        };

        var response = await adminClient.PostAsJsonAsync("/api/dental-services", request);
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<DentalServiceDto>();
    }

    public static CreateAppointmentDto NewAppointment(
        Guid patientId, Guid doctorProfileId, Guid dentalServiceId,
        DateOnly? date = null, string startTime = "09:00", string endTime = "09:30") =>
        new()
        {
            PatientId = patientId,
            DoctorProfileId = doctorProfileId,
            DentalServiceId = dentalServiceId,
            AppointmentDate = date ?? FutureDate(),
            StartTime = startTime,
            EndTime = endTime
        };

    public static async Task<AppointmentDto> CreateAppointmentAsync(
        HttpClient adminClient, Guid patientId, Guid doctorProfileId, Guid dentalServiceId,
        DateOnly? date = null, string startTime = "09:00", string endTime = "09:30")
    {
        var request = NewAppointment(patientId, doctorProfileId, dentalServiceId, date, startTime, endTime);
        var response = await adminClient.PostAsJsonAsync("/api/appointments", request);
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<AppointmentDto>();
    }

    /// <summary>
    /// Creates a fresh patient + doctor profile + service + appointment. Each
    /// call uses its own doctor, so appointments never conflict across tests.
    /// </summary>
    public static async Task<AppointmentGraph> CreateAppointmentGraphAsync(
        HttpClient adminClient, Guid? doctorProfileId = null)
    {
        var patient = await CreatePatientAsync(adminClient);
        var doctorId = doctorProfileId ?? (await CreateDoctorProfileAsync(adminClient)).Id;
        var service = await CreateDentalServiceAsync(adminClient);
        var appointment = await CreateAppointmentAsync(adminClient, patient.Id, doctorId, service.Id);

        return new AppointmentGraph(patient, doctorId, service, appointment);
    }

    public static async Task<VisitDto> StartVisitAsync(HttpClient client, Guid appointmentId)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/appointments/{appointmentId}/visit/start", new StartVisitDto());
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<VisitDto>();
    }

    public static async Task<InvoiceDto> CreateInvoiceAsync(
        HttpClient client, Guid patientId, decimal subtotal = 100m)
    {
        var request = new CreateInvoiceDto
        {
            PatientId = patientId,
            SubtotalAmount = subtotal
        };

        var response = await client.PostAsJsonAsync("/api/invoices", request);
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<InvoiceDto>();
    }

    public static async Task<InvoiceDto> AddPaymentAsync(HttpClient client, Guid invoiceId, decimal amount)
    {
        var response = await client.PostAsJsonAsync($"/api/invoices/{invoiceId}/payments", new AddPaymentDto
        {
            Amount = amount,
            PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Method = "Cash"
        });
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<InvoiceDto>();
    }
}

public sealed record AppointmentGraph(
    PatientDto Patient,
    Guid DoctorProfileId,
    DentalServiceDto Service,
    AppointmentDto Appointment);
