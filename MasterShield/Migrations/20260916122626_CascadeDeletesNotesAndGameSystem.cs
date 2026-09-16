using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MasterShield.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeletesNotesAndGameSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Campaigns_GameSystems_GameSystemId",
                table: "Campaigns");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Campaigns_CampaignId",
                table: "Notes");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Locations_LocationId",
                table: "Notes");

            migrationBuilder.AddForeignKey(
                name: "FK_Campaigns_GameSystems_GameSystemId",
                table: "Campaigns",
                column: "GameSystemId",
                principalTable: "GameSystems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Campaigns_CampaignId",
                table: "Notes",
                column: "CampaignId",
                principalTable: "Campaigns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Locations_LocationId",
                table: "Notes",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Campaigns_GameSystems_GameSystemId",
                table: "Campaigns");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Campaigns_CampaignId",
                table: "Notes");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Locations_LocationId",
                table: "Notes");

            migrationBuilder.AddForeignKey(
                name: "FK_Campaigns_GameSystems_GameSystemId",
                table: "Campaigns",
                column: "GameSystemId",
                principalTable: "GameSystems",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Campaigns_CampaignId",
                table: "Notes",
                column: "CampaignId",
                principalTable: "Campaigns",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Locations_LocationId",
                table: "Notes",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id");
        }
    }
}
