using System.Globalization;
using ClinicFlow.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Data;

/// <summary>
/// Development-only seed data. Never runs outside the Development
/// environment — production admin accounts must be created deliberately.
/// </summary>
public static class DbSeeder
{
    private const string AdminEmail = "admin@clinicflow.local";

    /// <summary>
    /// Dev-only fallback password, used only when SEED_ADMIN_PASSWORD is not
    /// set. Never rely on this outside local development.
    /// </summary>
    private const string DevOnlyFallbackPassword = "Admin@12345!";

    public static async Task SeedDevelopmentAdminAsync(AppDbContext context, IPasswordHasher<AppUser> passwordHasher)
    {
        var email = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL");
        if (string.IsNullOrWhiteSpace(email))
        {
            email = AdminEmail;
        }

        var fullName = Environment.GetEnvironmentVariable("SEED_ADMIN_NAME");
        if (string.IsNullOrWhiteSpace(fullName))
        {
            fullName = "ClinicFlow Admin";
        }

        var alreadySeeded = await context.AppUsers.AnyAsync(u => u.Email == email);
        if (alreadySeeded)
        {
            return;
        }

        var password = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD");
        if (string.IsNullOrWhiteSpace(password))
        {
            password = DevOnlyFallbackPassword;
        }

        var admin = new AppUser
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Email = email,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            PasswordHash = string.Empty
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, password);

        context.AppUsers.Add(admin);
        await context.SaveChangesAsync();
    }

    private const string DoctorLoginEmail = "doctor@clinicflow.local";
    private const string ReceptionistLoginEmail = "receptionist@clinicflow.local";

    /// <summary>
    /// Dev-only fallback passwords, used only when the matching env var is
    /// not set. Never rely on these outside local development.
    /// </summary>
    private const string DevOnlyDoctorPassword = "Doctor@12345!";
    private const string DevOnlyReceptionistPassword = "Reception@12345!";

    public static async Task SeedDentalClinicCoreSetupAsync(AppDbContext context, IPasswordHasher<AppUser> passwordHasher)
    {
        await SeedClinicSettingsAsync(context);
        await SeedDentalServicesAsync(context);
        var doctorLoginId = await SeedDemoLoginsAsync(context, passwordHasher);
        await SeedDoctorProfilesAsync(context, doctorLoginId);
    }

    private static async Task SeedClinicSettingsAsync(AppDbContext context)
    {
        var alreadySeeded = await context.ClinicSettings.AnyAsync();
        if (alreadySeeded)
        {
            return;
        }

        context.ClinicSettings.Add(new ClinicSettings
        {
            Id = Guid.NewGuid(),
            ClinicName = "ClinicFlow Dental Clinic",
            DefaultCurrency = "JOD",
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }

    private static async Task SeedDentalServicesAsync(AppDbContext context)
    {
        var demoServices = new (string Name, decimal Price, int DurationMinutes)[]
        {
            ("Consultation", 20m, 30),
            ("Dental Cleaning", 35m, 45),
            ("Tooth Filling", 45m, 60),
            ("Root Canal", 120m, 90),
            ("Tooth Extraction", 60m, 45),
            ("Teeth Whitening", 150m, 75)
        };

        foreach (var (name, price, durationMinutes) in demoServices)
        {
            var exists = await context.DentalServices.AnyAsync(s => s.Name == name);
            if (exists)
            {
                continue;
            }

            context.DentalServices.Add(new DentalService
            {
                Id = Guid.NewGuid(),
                Name = name,
                DefaultPrice = price,
                DurationMinutes = durationMinutes,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds one demo Doctor and one demo Receptionist login so role-based
    /// view-only access can be verified end-to-end in local development.
    /// </summary>
    private static async Task<Guid> SeedDemoLoginsAsync(AppDbContext context, IPasswordHasher<AppUser> passwordHasher)
    {
        var doctorUser = await context.AppUsers.SingleOrDefaultAsync(u => u.Email == DoctorLoginEmail);
        if (doctorUser is null)
        {
            var doctorPassword = Environment.GetEnvironmentVariable("SEED_DOCTOR_PASSWORD") ?? DevOnlyDoctorPassword;
            doctorUser = new AppUser
            {
                Id = Guid.NewGuid(),
                FullName = "Dr. Sarah Mitchell",
                Email = DoctorLoginEmail,
                Role = UserRole.Doctor,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                PasswordHash = string.Empty
            };
            doctorUser.PasswordHash = passwordHasher.HashPassword(doctorUser, doctorPassword);
            context.AppUsers.Add(doctorUser);
        }

        var receptionistExists = await context.AppUsers.AnyAsync(u => u.Email == ReceptionistLoginEmail);
        if (!receptionistExists)
        {
            var receptionistPassword = Environment.GetEnvironmentVariable("SEED_RECEPTIONIST_PASSWORD") ?? DevOnlyReceptionistPassword;
            var receptionist = new AppUser
            {
                Id = Guid.NewGuid(),
                FullName = "ClinicFlow Receptionist",
                Email = ReceptionistLoginEmail,
                Role = UserRole.Receptionist,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                PasswordHash = string.Empty
            };
            receptionist.PasswordHash = passwordHasher.HashPassword(receptionist, receptionistPassword);
            context.AppUsers.Add(receptionist);
        }

        await context.SaveChangesAsync();

        return doctorUser.Id;
    }

    private static async Task SeedDoctorProfilesAsync(AppDbContext context, Guid doctorLoginId)
    {
        var demoDoctors = new (string FullName, string Email, string Specialty, Guid? AppUserId)[]
        {
            ("Dr. Sarah Mitchell", DoctorLoginEmail, "General Dentist", doctorLoginId),
            ("Dr. Omar Haddad", "omar.haddad@clinicflow.local", "Orthodontist", null),
            ("Dr. Lina Nasser", "lina.nasser@clinicflow.local", "Endodontist", null)
        };

        foreach (var (fullName, email, specialty, appUserId) in demoDoctors)
        {
            var exists = await context.DoctorProfiles.AnyAsync(d => d.Email == email);
            if (exists)
            {
                continue;
            }

            context.DoctorProfiles.Add(new DoctorProfile
            {
                Id = Guid.NewGuid(),
                AppUserId = appUserId,
                FullName = fullName,
                Email = email,
                Specialty = specialty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await context.SaveChangesAsync();
    }

    /// <summary>Seeds fake demo patients for local development only. Never real patient data.</summary>
    public static async Task SeedDemoPatientsAsync(AppDbContext context)
    {
        var demoPatients = new (string FirstName, string LastName, string Phone, string? Email, PatientGender Gender, DateOnly? Dob)[]
        {
            ("Ahmad", "Khalil", "0790000001", "ahmad.khalil@example.com", PatientGender.Male, new DateOnly(1990, 3, 12)),
            ("Sara", "Mansour", "0790000002", "sara.mansour@example.com", PatientGender.Female, new DateOnly(1995, 7, 22)),
            ("Omar", "Saleh", "0790000003", null, PatientGender.Male, new DateOnly(1988, 11, 4)),
            ("Lina", "Faris", "0790000004", "lina.faris@example.com", PatientGender.Female, new DateOnly(2000, 1, 18)),
            ("Yousef", "Nabil", "0790000005", "yousef.nabil@example.com", PatientGender.Male, new DateOnly(1975, 5, 30)),
            ("Rana", "Abed", "0790000006", null, PatientGender.Female, new DateOnly(1998, 9, 9)),
            ("Khaled", "Sami", "0790000007", "khaled.sami@example.com", PatientGender.Male, new DateOnly(1985, 2, 14)),
            ("Dana", "Odeh", "0790000008", "dana.odeh@example.com", PatientGender.Female, new DateOnly(1992, 12, 25)),
            ("Tariq", "Fayez", "0790000009", null, PatientGender.Male, new DateOnly(2005, 6, 1)),
            ("Maya", "Rashid", "0790000010", "maya.rashid@example.com", PatientGender.PreferNotToSay, new DateOnly(1980, 8, 17))
        };

        foreach (var (firstName, lastName, phone, email, gender, dob) in demoPatients)
        {
            var exists = await context.Patients.AnyAsync(p => p.FirstName == firstName && p.LastName == lastName && p.PhoneNumber == phone);
            if (exists)
            {
                continue;
            }

            context.Patients.Add(new Patient
            {
                Id = Guid.NewGuid(),
                FirstName = firstName,
                LastName = lastName,
                PhoneNumber = phone,
                Email = email,
                Gender = gender,
                DateOfBirth = dob,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds fake demo appointments spread across today, tomorrow, earlier
    /// this week, and next week, using the already-seeded demo doctors,
    /// patients, and dental services. Skips entirely if any appointment
    /// already exists, so it never duplicates or drifts on repeat runs.
    /// </summary>
    public static async Task SeedDemoAppointmentsAsync(AppDbContext context)
    {
        var alreadySeeded = await context.Appointments.AnyAsync();
        if (alreadySeeded)
        {
            return;
        }

        var doctorSarah = await context.DoctorProfiles.SingleOrDefaultAsync(d => d.Email == DoctorLoginEmail);
        var doctorOmar = await context.DoctorProfiles.SingleOrDefaultAsync(d => d.Email == "omar.haddad@clinicflow.local");
        var doctorLina = await context.DoctorProfiles.SingleOrDefaultAsync(d => d.Email == "lina.nasser@clinicflow.local");

        var serviceNames = new[] { "Consultation", "Dental Cleaning", "Tooth Filling", "Root Canal", "Tooth Extraction", "Teeth Whitening" };
        var servicesByName = await context.DentalServices
            .Where(s => serviceNames.Contains(s.Name))
            .ToDictionaryAsync(s => s.Name);

        var patientPhones = new[]
        {
            "0790000001", "0790000002", "0790000003", "0790000004", "0790000005",
            "0790000006", "0790000007", "0790000008", "0790000009", "0790000010"
        };
        var patientsByPhone = await context.Patients
            .Where(p => patientPhones.Contains(p.PhoneNumber))
            .ToDictionaryAsync(p => p.PhoneNumber);

        if (doctorSarah is null || doctorOmar is null || doctorLina is null
            || servicesByName.Count < serviceNames.Length || patientsByPhone.Count < patientPhones.Length)
        {
            // Core setup or demo patients haven't been seeded yet — nothing to attach demo appointments to.
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var seedRows = new (int DayOffset, DoctorProfile Doctor, Patient Patient, DentalService Service, string StartTime, AppointmentStatus Status)[]
        {
            (0, doctorSarah, patientsByPhone["0790000001"], servicesByName["Consultation"], "09:00", AppointmentStatus.Scheduled),
            (0, doctorOmar, patientsByPhone["0790000002"], servicesByName["Dental Cleaning"], "09:30", AppointmentStatus.Arrived),
            (0, doctorLina, patientsByPhone["0790000003"], servicesByName["Tooth Filling"], "10:00", AppointmentStatus.InProgress),
            (0, doctorSarah, patientsByPhone["0790000004"], servicesByName["Root Canal"], "11:00", AppointmentStatus.Scheduled),
            (0, doctorOmar, patientsByPhone["0790000003"], servicesByName["Teeth Whitening"], "16:00", AppointmentStatus.Scheduled),
            (1, doctorOmar, patientsByPhone["0790000005"], servicesByName["Tooth Extraction"], "13:00", AppointmentStatus.Scheduled),
            (1, doctorLina, patientsByPhone["0790000006"], servicesByName["Consultation"], "14:00", AppointmentStatus.Scheduled),
            (-1, doctorSarah, patientsByPhone["0790000007"], servicesByName["Dental Cleaning"], "10:00", AppointmentStatus.Completed),
            (-2, doctorOmar, patientsByPhone["0790000008"], servicesByName["Tooth Filling"], "09:00", AppointmentStatus.Completed),
            (-2, doctorLina, patientsByPhone["0790000009"], servicesByName["Consultation"], "15:00", AppointmentStatus.NoShow),
            (-3, doctorSarah, patientsByPhone["0790000010"], servicesByName["Teeth Whitening"], "09:00", AppointmentStatus.Cancelled),
            (7, doctorOmar, patientsByPhone["0790000001"], servicesByName["Root Canal"], "10:00", AppointmentStatus.Scheduled),
            (8, doctorLina, patientsByPhone["0790000002"], servicesByName["Tooth Extraction"], "11:00", AppointmentStatus.Scheduled),
        };

        foreach (var row in seedRows)
        {
            var start = TimeOnly.ParseExact(row.StartTime, "HH:mm", CultureInfo.InvariantCulture);
            var end = start.AddMinutes(row.Service.DurationMinutes);

            context.Appointments.Add(new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = row.Patient.Id,
                DoctorProfileId = row.Doctor.Id,
                DentalServiceId = row.Service.Id,
                AppointmentDate = today.AddDays(row.DayOffset),
                StartTime = start,
                EndTime = end,
                Status = row.Status,
                Reason = "Routine dental visit",
                CancellationReason = row.Status == AppointmentStatus.Cancelled ? "Patient requested reschedule" : null,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds fake demo visits for local development only, reusing whichever
    /// completed/in-progress demo appointments already exist and topping up
    /// with a couple of dedicated demo appointments so there are always 4-6
    /// visit-eligible rows — this works correctly even against an
    /// already-seeded local database, not just a fresh one. Skips entirely if
    /// any visit already exists, so it never duplicates or drifts on repeat
    /// runs.
    /// </summary>
    public static async Task SeedDemoVisitsAsync(AppDbContext context)
    {
        var alreadySeeded = await context.Visits.AnyAsync();
        if (alreadySeeded)
        {
            return;
        }

        var doctorSarah = await context.DoctorProfiles.SingleOrDefaultAsync(d => d.Email == DoctorLoginEmail);
        var doctorOmar = await context.DoctorProfiles.SingleOrDefaultAsync(d => d.Email == "omar.haddad@clinicflow.local");
        var doctorLina = await context.DoctorProfiles.SingleOrDefaultAsync(d => d.Email == "lina.nasser@clinicflow.local");

        var consultation = await context.DentalServices.SingleOrDefaultAsync(s => s.Name == "Consultation");
        var cleaning = await context.DentalServices.SingleOrDefaultAsync(s => s.Name == "Dental Cleaning");
        var filling = await context.DentalServices.SingleOrDefaultAsync(s => s.Name == "Tooth Filling");

        var patientPhones = new[] { "0790000001", "0790000004", "0790000006" };
        var patientsByPhone = await context.Patients
            .Where(p => patientPhones.Contains(p.PhoneNumber))
            .ToDictionaryAsync(p => p.PhoneNumber);

        if (doctorSarah is null || doctorOmar is null || doctorLina is null
            || consultation is null || cleaning is null || filling is null
            || patientsByPhone.Count < patientPhones.Length)
        {
            // Core setup, demo doctors, or demo patients haven't been seeded yet.
            return;
        }

        // Reuse whichever completed/in-progress demo appointments already exist...
        var eligibleAppointments = await context.Appointments
            .Where(a => a.Status == AppointmentStatus.Completed || a.Status == AppointmentStatus.InProgress)
            .ToListAsync();

        // ...topped up with a couple of dedicated demo appointments so there
        // are always enough visit-eligible rows regardless of what's already
        // seeded in this database.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var topUpRows = new (int DayOffset, DoctorProfile Doctor, Patient Patient, DentalService Service, string StartTime)[]
        {
            (-4, doctorSarah, patientsByPhone["0790000001"], consultation, "09:00"),
            (-5, doctorOmar, patientsByPhone["0790000004"], cleaning, "10:00"),
            (-6, doctorLina, patientsByPhone["0790000006"], filling, "11:00"),
        };

        foreach (var row in topUpRows)
        {
            if (eligibleAppointments.Count >= 6)
            {
                break;
            }

            var start = TimeOnly.ParseExact(row.StartTime, "HH:mm", CultureInfo.InvariantCulture);
            var appointment = new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = row.Patient.Id,
                DoctorProfileId = row.Doctor.Id,
                DentalServiceId = row.Service.Id,
                AppointmentDate = today.AddDays(row.DayOffset),
                StartTime = start,
                EndTime = start.AddMinutes(row.Service.DurationMinutes),
                Status = AppointmentStatus.Completed,
                Reason = "Demo appointment seeded for visit records",
                CreatedAtUtc = DateTime.UtcNow
            };

            context.Appointments.Add(appointment);
            eligibleAppointments.Add(appointment);
        }

        if (eligibleAppointments.Count == 0)
        {
            return;
        }

        var demoNotes = new (string ChiefComplaint, string DiagnosisNote, string TreatmentNote, string ToothNumbers, string PrescriptionNote)[]
        {
            ("Routine dental check", "Manual note entered by doctor for demo only", "Cleaning performed", "Demo: 14", "Demo prescription text only"),
            ("Tooth pain on chewing", "Manual note entered by doctor for demo only", "Filling replaced", "Demo: 26", "Demo prescription text only"),
            ("Follow-up after filling", "Manual note entered by doctor for demo only", "Bite adjusted", "Demo: 26", "Demo prescription text only"),
            ("Sensitivity to cold", "Manual note entered by doctor for demo only", "Fluoride treatment applied", "Demo: 30", "Demo prescription text only"),
            ("Routine dental check", "Manual note entered by doctor for demo only", "Cleaning performed", "Demo: 11", "Demo prescription text only"),
            ("Gum tenderness", "Manual note entered by doctor for demo only", "Deep cleaning performed", "Demo: 19", "Demo prescription text only"),
        };

        var now = DateTime.UtcNow;
        for (var i = 0; i < eligibleAppointments.Count && i < 6; i++)
        {
            var appointment = eligibleAppointments[i];
            var notes = demoNotes[i % demoNotes.Length];
            var isInProgress = appointment.Status == AppointmentStatus.InProgress;

            context.Visits.Add(new Visit
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                PatientId = appointment.PatientId,
                DoctorProfileId = appointment.DoctorProfileId,
                VisitDate = appointment.AppointmentDate,
                Status = isInProgress ? VisitStatus.InProgress : VisitStatus.Completed,
                ChiefComplaint = notes.ChiefComplaint,
                DiagnosisNote = notes.DiagnosisNote,
                TreatmentNote = notes.TreatmentNote,
                ToothNumbers = notes.ToothNumbers,
                PrescriptionNote = isInProgress ? null : notes.PrescriptionNote,
                FollowUpDate = isInProgress ? null : today.AddDays(14 + i),
                StartedAtUtc = now,
                CompletedAtUtc = isInProgress ? null : now,
                CreatedAtUtc = now
            });
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds fake demo invoices and payments for local development only,
    /// linked to whichever demo appointments/visits already exist, topped up
    /// with standalone patient invoices so there are always ~10 rows across
    /// Unpaid / PartiallyPaid / Paid. Money fields follow the same invariants
    /// InvoiceService maintains. Skips entirely if any invoice already
    /// exists, so it never duplicates or drifts on repeat runs.
    /// </summary>
    public static async Task SeedDemoInvoicesAsync(AppDbContext context)
    {
        var alreadySeeded = await context.Invoices.AnyAsync();
        if (alreadySeeded)
        {
            return;
        }

        var receptionist = await context.AppUsers.SingleOrDefaultAsync(u => u.Email == ReceptionistLoginEmail);

        // Invoice the appointments that already have a visit first (most
        // realistic), then other non-cancelled appointments, then plain
        // patients — mirroring manual "Create Invoice" usage.
        var visitsByAppointmentId = await context.Visits.ToDictionaryAsync(v => v.AppointmentId);
        var appointments = await context.Appointments
            .Include(a => a.DentalService)
            .Where(a => a.Status != AppointmentStatus.Cancelled && a.Status != AppointmentStatus.NoShow)
            .OrderBy(a => a.AppointmentDate)
            .Take(8)
            .ToListAsync();
        var patients = await context.Patients.OrderBy(p => p.PhoneNumber).Take(4).ToListAsync();
        var fallbackService = await context.DentalServices.FirstOrDefaultAsync(s => s.Name == "Consultation");

        if (appointments.Count == 0 && (patients.Count == 0 || fallbackService is null))
        {
            // Demo appointments and patients haven't been seeded yet.
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTime.UtcNow;
        var sequence = 1;
        var invoiceCount = 0;

        // Rotates Paid, PartiallyPaid, Unpaid across the seeded invoices.
        void AddInvoice(Guid patientId, Appointment? appointment, Visit? visit, DentalService? service, decimal discount)
        {
            var subtotal = service?.DefaultPrice ?? 25m;
            var total = subtotal - discount;
            var paymentKind = invoiceCount % 3;
            var paid = paymentKind switch
            {
                0 => total,          // Paid
                1 => Math.Round(total / 2, 2), // PartiallyPaid
                _ => 0m              // Unpaid
            };

            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                InvoiceNumber = $"INV-{now.Year}-{sequence++:D4}",
                PatientId = patientId,
                AppointmentId = appointment?.Id,
                VisitId = visit?.Id,
                DentalServiceId = service?.Id,
                IssueDate = today.AddDays(-invoiceCount),
                DueDate = paymentKind == 2 ? today.AddDays(14) : null,
                SubtotalAmount = subtotal,
                DiscountAmount = discount,
                TotalAmount = total,
                PaidAmount = paid,
                RemainingAmount = total - paid,
                Status = paid == 0m ? PaymentStatus.Unpaid
                    : paid >= total ? PaymentStatus.Paid
                    : PaymentStatus.PartiallyPaid,
                Notes = "Demo invoice seeded for local development only.",
                CreatedAtUtc = now
            };
            context.Invoices.Add(invoice);

            if (paid > 0m)
            {
                context.Payments.Add(new Payment
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoice.Id,
                    Amount = paid,
                    PaymentDate = invoice.IssueDate,
                    Method = (PaymentMethod)(invoiceCount % 3), // Cash / Card / BankTransfer
                    ReferenceNumber = paymentKind == 0 ? $"DEMO-REF-{sequence:D4}" : null,
                    Notes = "Demo payment seeded for local development only.",
                    CreatedByUserId = receptionist?.Id,
                    CreatedAtUtc = now
                });
            }

            invoiceCount++;
        }

        foreach (var appointment in appointments)
        {
            visitsByAppointmentId.TryGetValue(appointment.Id, out var visit);
            AddInvoice(appointment.PatientId, appointment, visit, appointment.DentalService, invoiceCount % 4 == 0 ? 5m : 0m);
        }

        foreach (var patient in patients)
        {
            if (invoiceCount >= 10)
            {
                break;
            }

            AddInvoice(patient.Id, null, null, fallbackService, 0m);
        }

        await context.SaveChangesAsync();
    }
}
