using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MasterShield.Migrations
{
    /// <inheritdoc />
    public partial class SystemTemplatesAndEncounterResources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ResourceOverrides",
                table: "EncounterParticipants",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "EncounterResourceIds",
                table: "Actors",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.CreateTable(
                name: "SystemEntityTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameSystemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ImageUri = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Resources = table.Column<string>(type: "jsonb", nullable: false),
                    SystemData = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemEntityTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemEntityTemplates_GameSystems_GameSystemId",
                        column: x => x.GameSystemId,
                        principalTable: "GameSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SystemEntityTemplates_GameSystemId",
                table: "SystemEntityTemplates",
                column: "GameSystemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemEntityTemplates");

            migrationBuilder.DropColumn(
                name: "ResourceOverrides",
                table: "EncounterParticipants");

            migrationBuilder.DropColumn(
                name: "EncounterResourceIds",
                table: "Actors");
        }
    }
}
