using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MasterShield.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeletes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Actors_ActorId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Locations_LocationId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Rules_RuleId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Sessions_SessionId",
                table: "Notes");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Actors_ActorId",
                table: "Attachments",
                column: "ActorId",
                principalTable: "Actors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Locations_LocationId",
                table: "Attachments",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Rules_RuleId",
                table: "Attachments",
                column: "RuleId",
                principalTable: "Rules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Sessions_SessionId",
                table: "Notes",
                column: "SessionId",
                principalTable: "Sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Actors_ActorId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Locations_LocationId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Rules_RuleId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Sessions_SessionId",
                table: "Notes");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Actors_ActorId",
                table: "Attachments",
                column: "ActorId",
                principalTable: "Actors",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Locations_LocationId",
                table: "Attachments",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Rules_RuleId",
                table: "Attachments",
                column: "RuleId",
                principalTable: "Rules",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Sessions_SessionId",
                table: "Notes",
                column: "SessionId",
                principalTable: "Sessions",
                principalColumn: "Id");
        }
    }
}
