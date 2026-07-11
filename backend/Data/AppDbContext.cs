using ClinicFlow.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Data;

/// <summary>
/// Application database context. DbSets are added as each feature (auth,
/// patients, appointments, etc.) is built out phase by phase.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
    public DbSet<DentalService> DentalServices => Set<DentalService>();
    public DbSet<ClinicSettings> ClinicSettings => Set<ClinicSettings>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<PatientMedicalHistory> PatientMedicalHistories => Set<PatientMedicalHistory>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.FullName).HasMaxLength(200).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(32);
        });

        modelBuilder.Entity<DoctorProfile>(entity =>
        {
            entity.Property(d => d.FullName).HasMaxLength(200).IsRequired();
            entity.Property(d => d.Email).HasMaxLength(256).IsRequired();
            entity.Property(d => d.PhoneNumber).HasMaxLength(30);
            entity.Property(d => d.Specialty).HasMaxLength(150).IsRequired();
            entity.Property(d => d.LicenseNumber).HasMaxLength(100);
            entity.Property(d => d.Bio).HasMaxLength(2000);

            entity.HasIndex(d => d.AppUserId)
                .IsUnique()
                .HasFilter("\"AppUserId\" IS NOT NULL");

            entity.HasOne(d => d.AppUser)
                .WithMany()
                .HasForeignKey(d => d.AppUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<DentalService>(entity =>
        {
            entity.Property(s => s.Name).HasMaxLength(150).IsRequired();
            entity.Property(s => s.Description).HasMaxLength(1000);
            entity.Property(s => s.DefaultPrice).HasPrecision(10, 2);

            entity.HasIndex(s => s.Name).IsUnique();
        });

        modelBuilder.Entity<ClinicSettings>(entity =>
        {
            entity.Property(c => c.ClinicName).HasMaxLength(200).IsRequired();
            entity.Property(c => c.PhoneNumber).HasMaxLength(30);
            entity.Property(c => c.Email).HasMaxLength(256);
            entity.Property(c => c.Address).HasMaxLength(300);
            entity.Property(c => c.DefaultCurrency).HasMaxLength(10).IsRequired();
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.Property(p => p.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(p => p.LastName).HasMaxLength(100).IsRequired();
            entity.Property(p => p.PhoneNumber).HasMaxLength(30).IsRequired();
            entity.Property(p => p.Email).HasMaxLength(256);
            entity.Property(p => p.Gender).HasConversion<string>().HasMaxLength(32);
            entity.Property(p => p.Address).HasMaxLength(300);
            entity.Property(p => p.EmergencyContactName).HasMaxLength(200);
            entity.Property(p => p.EmergencyContactPhone).HasMaxLength(30);
            entity.Property(p => p.MedicalNotes).HasMaxLength(2000);
            entity.Property(p => p.Allergies).HasMaxLength(1000);

            // No unique constraint on PhoneNumber/Email: family members
            // sharing a household phone number is common in clinic intake.
            entity.HasIndex(p => p.PhoneNumber);
            entity.HasIndex(p => p.Email);
            entity.HasIndex(p => p.IsActive);
        });

        modelBuilder.Entity<PatientMedicalHistory>(entity =>
        {
            entity.Property(h => h.PatientId).IsRequired();
            entity.Property(h => h.Allergies).HasMaxLength(1000);
            entity.Property(h => h.ChronicDiseases).HasMaxLength(1000);
            entity.Property(h => h.CurrentMedications).HasMaxLength(1000);
            entity.Property(h => h.PreviousSurgeries).HasMaxLength(1000);
            entity.Property(h => h.PregnancyStatus).HasConversion<string>().HasMaxLength(32);
            entity.Property(h => h.SmokingStatus).HasConversion<string>().HasMaxLength(32);
            entity.Property(h => h.DiabetesStatus).HasConversion<string>().HasMaxLength(32);
            entity.Property(h => h.BloodPressureNotes).HasMaxLength(500);
            entity.Property(h => h.MedicalAlerts).HasMaxLength(1000);
            entity.Property(h => h.EmergencyContactName).HasMaxLength(200);
            entity.Property(h => h.EmergencyContactPhone).HasMaxLength(30);

            // One medical history record per patient — the PUT endpoint
            // upserts, and the database guarantees no duplicates slip in.
            entity.HasIndex(h => h.PatientId).IsUnique();

            entity.HasOne(h => h.Patient)
                .WithMany()
                .HasForeignKey(h => h.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(h => h.LastUpdatedByUser)
                .WithMany()
                .HasForeignKey(h => h.LastUpdatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.Property(a => a.PatientId).IsRequired();
            entity.Property(a => a.DoctorProfileId).IsRequired();
            entity.Property(a => a.DentalServiceId).IsRequired();
            entity.Property(a => a.AppointmentDate).IsRequired();
            entity.Property(a => a.StartTime).IsRequired();
            entity.Property(a => a.EndTime).IsRequired();
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(a => a.Reason).HasMaxLength(500);
            entity.Property(a => a.Notes).HasMaxLength(2000);
            entity.Property(a => a.CancellationReason).HasMaxLength(500);

            entity.HasIndex(a => a.AppointmentDate);
            entity.HasIndex(a => new { a.DoctorProfileId, a.AppointmentDate });
            entity.HasIndex(a => a.PatientId);
            entity.HasIndex(a => a.Status);

            entity.HasOne(a => a.Patient)
                .WithMany()
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.DoctorProfile)
                .WithMany()
                .HasForeignKey(a => a.DoctorProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.DentalService)
                .WithMany()
                .HasForeignKey(a => a.DentalServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Visit>(entity =>
        {
            entity.Property(v => v.PatientId).IsRequired();
            entity.Property(v => v.DoctorProfileId).IsRequired();
            entity.Property(v => v.VisitDate).IsRequired();
            entity.Property(v => v.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(v => v.ChiefComplaint).HasMaxLength(500);
            entity.Property(v => v.DiagnosisNote).HasMaxLength(2000);
            entity.Property(v => v.TreatmentNote).HasMaxLength(2000);
            entity.Property(v => v.ToothNumbers).HasMaxLength(200);
            entity.Property(v => v.PrescriptionNote).HasMaxLength(2000);
            entity.Property(v => v.InternalNotes).HasMaxLength(2000);

            entity.HasIndex(v => v.AppointmentId).IsUnique();
            entity.HasIndex(v => v.PatientId);
            entity.HasIndex(v => v.DoctorProfileId);
            entity.HasIndex(v => v.VisitDate);
            entity.HasIndex(v => v.Status);

            entity.HasOne(v => v.Appointment)
                .WithMany()
                .HasForeignKey(v => v.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(v => v.Patient)
                .WithMany()
                .HasForeignKey(v => v.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(v => v.DoctorProfile)
                .WithMany()
                .HasForeignKey(v => v.DoctorProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.Property(i => i.InvoiceNumber).HasMaxLength(20).IsRequired();
            entity.Property(i => i.PatientId).IsRequired();
            entity.Property(i => i.IssueDate).IsRequired();
            entity.Property(i => i.SubtotalAmount).HasPrecision(10, 2);
            entity.Property(i => i.DiscountAmount).HasPrecision(10, 2);
            entity.Property(i => i.TotalAmount).HasPrecision(10, 2);
            entity.Property(i => i.PaidAmount).HasPrecision(10, 2);
            entity.Property(i => i.RemainingAmount).HasPrecision(10, 2);
            entity.Property(i => i.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(i => i.Notes).HasMaxLength(2000);

            entity.HasIndex(i => i.InvoiceNumber).IsUnique();
            entity.HasIndex(i => i.PatientId);
            entity.HasIndex(i => i.Status);
            entity.HasIndex(i => i.IssueDate);

            // At most one invoice per appointment and per visit — enforced at
            // the database so GET /api/appointments/{id}/invoice stays single-valued.
            entity.HasIndex(i => i.AppointmentId)
                .IsUnique()
                .HasFilter("\"AppointmentId\" IS NOT NULL");
            entity.HasIndex(i => i.VisitId)
                .IsUnique()
                .HasFilter("\"VisitId\" IS NOT NULL");

            entity.HasOne(i => i.Patient)
                .WithMany()
                .HasForeignKey(i => i.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.Appointment)
                .WithMany()
                .HasForeignKey(i => i.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.Visit)
                .WithMany()
                .HasForeignKey(i => i.VisitId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.DentalService)
                .WithMany()
                .HasForeignKey(i => i.DentalServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.InvoiceId).IsRequired();
            entity.Property(p => p.Amount).HasPrecision(10, 2);
            entity.Property(p => p.PaymentDate).IsRequired();
            entity.Property(p => p.Method).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(p => p.ReferenceNumber).HasMaxLength(100);
            entity.Property(p => p.Notes).HasMaxLength(1000);

            entity.HasIndex(p => p.InvoiceId);

            entity.HasOne(p => p.Invoice)
                .WithMany(i => i.Payments)
                .HasForeignKey(p => p.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.CreatedByUser)
                .WithMany()
                .HasForeignKey(p => p.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.Property(a => a.UserEmail).HasMaxLength(256);
            entity.Property(a => a.UserFullName).HasMaxLength(200);
            entity.Property(a => a.UserRole).HasMaxLength(32);
            entity.Property(a => a.Action).HasMaxLength(64).IsRequired();
            entity.Property(a => a.EntityType).HasMaxLength(64).IsRequired();
            entity.Property(a => a.EntityDisplayName).HasMaxLength(300);
            entity.Property(a => a.Summary).HasMaxLength(500).IsRequired();
            entity.Property(a => a.IpAddress).HasMaxLength(45);
            entity.Property(a => a.UserAgent).HasMaxLength(512);

            entity.HasIndex(a => a.CreatedAtUtc);
            entity.HasIndex(a => a.UserId);
            entity.HasIndex(a => a.EntityType);
            entity.HasIndex(a => a.EntityId);
            entity.HasIndex(a => a.Action);
        });
    }
}
