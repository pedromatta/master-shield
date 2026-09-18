using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Daedala.Migrations
{
    /// <inheritdoc />
    public partial class BlueprintsAndIcons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TargetEntity",
                table: "SystemBlueprints",
                newName: "Kind");

            migrationBuilder.RenameColumn(
                name: "DefaultPayload",
                table: "SystemBlueprints",
                newName: "RuleCategories");

            migrationBuilder.AddColumn<string>(
                name: "ActorType",
                table: "SystemBlueprints",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Attributes",
                table: "SystemBlueprints",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NoteCategories",
                table: "SystemBlueprints",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Resources",
                table: "SystemBlueprints",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IconId",
                table: "Rules",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ImageUri",
                table: "Rules",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IconId",
                table: "Actors",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ActorRuleLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    RuleId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActorRuleLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActorRuleLinks_Actors_ActorId",
                        column: x => x.ActorId,
                        principalTable: "Actors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ActorRuleLinks_Rules_RuleId",
                        column: x => x.RuleId,
                        principalTable: "Rules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActorRuleLinks_ActorId",
                table: "ActorRuleLinks",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_ActorRuleLinks_RuleId",
                table: "ActorRuleLinks",
                column: "RuleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActorRuleLinks");

            migrationBuilder.DropColumn(
                name: "ActorType",
                table: "SystemBlueprints");

            migrationBuilder.DropColumn(
                name: "Attributes",
                table: "SystemBlueprints");

            migrationBuilder.DropColumn(
                name: "NoteCategories",
                table: "SystemBlueprints");

            migrationBuilder.DropColumn(
                name: "Resources",
                table: "SystemBlueprints");

            migrationBuilder.DropColumn(
                name: "IconId",
                table: "Rules");

            migrationBuilder.DropColumn(
                name: "ImageUri",
                table: "Rules");

            migrationBuilder.DropColumn(
                name: "IconId",
                table: "Actors");

            migrationBuilder.RenameColumn(
                name: "RuleCategories",
                table: "SystemBlueprints",
                newName: "DefaultPayload");

            migrationBuilder.RenameColumn(
                name: "Kind",
                table: "SystemBlueprints",
                newName: "TargetEntity");
        }
    }
}
