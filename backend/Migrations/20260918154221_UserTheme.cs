using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Daedala.Migrations
{
    /// <inheritdoc />
    public partial class UserTheme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ThemeAccent",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundUri",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeDanger",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeFontBody",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeFontDisplay",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeSuccess",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThemeAccent",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBackgroundUri",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeDanger",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeFontBody",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeFontDisplay",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeSuccess",
                table: "AspNetUsers");
        }
    }
}
