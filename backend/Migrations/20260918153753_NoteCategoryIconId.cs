using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Daedala.Migrations
{
    /// <inheritdoc />
    public partial class NoteCategoryIconId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IconId",
                table: "NoteCategories",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IconId",
                table: "NoteCategories");
        }
    }
}
