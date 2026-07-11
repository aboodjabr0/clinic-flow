using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientMedicalHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PatientMedicalHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Allergies = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ChronicDiseases = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CurrentMedications = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PreviousSurgeries = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PregnancyStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SmokingStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DiabetesStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    BloodPressureNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    HeartDisease = table.Column<bool>(type: "boolean", nullable: false),
                    BloodThinners = table.Column<bool>(type: "boolean", nullable: false),
                    AnesthesiaSensitivity = table.Column<bool>(type: "boolean", nullable: false),
                    MedicalAlerts = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    EmergencyContactName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EmergencyContactPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientMedicalHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientMedicalHistories_AppUsers_LastUpdatedByUserId",
                        column: x => x.LastUpdatedByUserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientMedicalHistories_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PatientMedicalHistories_LastUpdatedByUserId",
                table: "PatientMedicalHistories",
                column: "LastUpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientMedicalHistories_PatientId",
                table: "PatientMedicalHistories",
                column: "PatientId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PatientMedicalHistories");
        }
    }
}
