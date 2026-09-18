using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Daedala.Migrations
{
    /// <inheritdoc />
    public partial class ContentManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Locations_Tags_TagId",
                table: "Locations");

            migrationBuilder.DropForeignKey(
                name: "FK_Rules_Tags_TagId",
                table: "Rules");

            migrationBuilder.DropIndex(
                name: "IX_Rules_TagId",
                table: "Rules");

            migrationBuilder.DropIndex(
                name: "IX_Locations_TagId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "TagId",
                table: "Rules");

            migrationBuilder.DropColumn(
                name: "TagId",
                table: "Locations");

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "RuleCategories",
                type: "text",
                nullable: false,
                defaultValue: "📖");

            migrationBuilder.AddColumn<bool>(
                name: "ShowInToolbar",
                table: "RuleCategories",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "RuleCategories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "NoteCategoryId",
                table: "Notes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUri",
                table: "Locations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Boxes",
                table: "Counters",
                type: "integer",
                nullable: false,
                defaultValue: 4);

            migrationBuilder.AddColumn<string>(
                name: "ColorHex",
                table: "Counters",
                type: "text",
                nullable: false,
                defaultValue: "#38bdf8");

            migrationBuilder.AddColumn<Guid>(
                name: "CurrentMapLocationId",
                table: "Campaigns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUri",
                table: "Actors",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Existing counters used a max value; treat that as the box count.
            migrationBuilder.Sql(
                "UPDATE \"Counters\" SET \"Boxes\" = GREATEST(COALESCE(\"MaxValue\", 4), 1);");

            migrationBuilder.CreateTable(
                name: "CounterTag",
                columns: table => new
                {
                    CountersId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CounterTag", x => new { x.CountersId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_CounterTag_Counters_CountersId",
                        column: x => x.CountersId,
                        principalTable: "Counters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CounterTag_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LocationTag",
                columns: table => new
                {
                    LocationsId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationTag", x => new { x.LocationsId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_LocationTag_Locations_LocationsId",
                        column: x => x.LocationsId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LocationTag_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoteCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteCategories_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoteTag",
                columns: table => new
                {
                    NotesId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteTag", x => new { x.NotesId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_NoteTag_Notes_NotesId",
                        column: x => x.NotesId,
                        principalTable: "Notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NoteTag_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RuleTag",
                columns: table => new
                {
                    RulesId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RuleTag", x => new { x.RulesId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_RuleTag_Rules_RulesId",
                        column: x => x.RulesId,
                        principalTable: "Rules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RuleTag_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notes_NoteCategoryId",
                table: "Notes",
                column: "NoteCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_CounterTag_TagsId",
                table: "CounterTag",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_LocationTag_TagsId",
                table: "LocationTag",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteCategories_CampaignId",
                table: "NoteCategories",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteTag_TagsId",
                table: "NoteTag",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_RuleTag_TagsId",
                table: "RuleTag",
                column: "TagsId");

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_NoteCategories_NoteCategoryId",
                table: "Notes",
                column: "NoteCategoryId",
                principalTable: "NoteCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notes_NoteCategories_NoteCategoryId",
                table: "Notes");

            migrationBuilder.DropTable(
                name: "CounterTag");

            migrationBuilder.DropTable(
                name: "LocationTag");

            migrationBuilder.DropTable(
                name: "NoteCategories");

            migrationBuilder.DropTable(
                name: "NoteTag");

            migrationBuilder.DropTable(
                name: "RuleTag");

            migrationBuilder.DropIndex(
                name: "IX_Notes_NoteCategoryId",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "RuleCategories");

            migrationBuilder.DropColumn(
                name: "ShowInToolbar",
                table: "RuleCategories");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "RuleCategories");

            migrationBuilder.DropColumn(
                name: "NoteCategoryId",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "ImageUri",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "Boxes",
                table: "Counters");

            migrationBuilder.DropColumn(
                name: "ColorHex",
                table: "Counters");

            migrationBuilder.DropColumn(
                name: "CurrentMapLocationId",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "ImageUri",
                table: "Actors");

            migrationBuilder.AddColumn<Guid>(
                name: "TagId",
                table: "Rules",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TagId",
                table: "Locations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rules_TagId",
                table: "Rules",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_TagId",
                table: "Locations",
                column: "TagId");

            migrationBuilder.AddForeignKey(
                name: "FK_Locations_Tags_TagId",
                table: "Locations",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Rules_Tags_TagId",
                table: "Rules",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id");
        }
    }
}
