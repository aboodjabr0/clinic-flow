namespace ClinicFlow.Api.Common;

/// <summary>
/// Free-form action/entity-type constants for AuditLog. Plain strings rather
/// than enums: they're stored and searched as strings, and new actions can be
/// added without a migration.
/// </summary>
public static class AuditActions
{
    public const string Created = "Created";
    public const string Updated = "Updated";
    public const string Deleted = "Deleted";
    public const string Activated = "Activated";
    public const string Deactivated = "Deactivated";
    public const string StatusChanged = "StatusChanged";
    public const string Cancelled = "Cancelled";
    public const string PaymentAdded = "PaymentAdded";
    public const string LoginSucceeded = "LoginSucceeded";
    public const string LoginFailed = "LoginFailed";
    public const string VisitStarted = "VisitStarted";
    public const string VisitCompleted = "VisitCompleted";
    public const string InvoiceCreated = "InvoiceCreated";
    public const string SettingsUpdated = "SettingsUpdated";
}

public static class AuditEntityTypes
{
    public const string Patient = "Patient";
    public const string DoctorProfile = "DoctorProfile";
    public const string DentalService = "DentalService";
    public const string ClinicSettings = "ClinicSettings";
    public const string Appointment = "Appointment";
    public const string Visit = "Visit";
    public const string Invoice = "Invoice";
    public const string Payment = "Payment";
    public const string Auth = "Auth";
    public const string User = "User";
}
