using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Daedala.Migrations
{
    /// <inheritdoc />
    public partial class UserCustomization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundAttachment",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundBlur",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundFit",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundOpacity",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundPosition",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBackgroundRepeat",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeBorderColor",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeChromeOpacity",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeSecondary",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeSurfaceBase",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeSurfaceInset",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeSurfacePanel",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeSurfaceRaised",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeTextMain",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeTextMuted",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeWindowOpacity",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThemeBackgroundAttachment",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBackgroundBlur",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBackgroundFit",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBackgroundOpacity",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBackgroundPosition",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBackgroundRepeat",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeBorderColor",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeChromeOpacity",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeSecondary",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeSurfaceBase",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeSurfaceInset",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeSurfacePanel",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeSurfaceRaised",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeTextMain",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeTextMuted",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeWindowOpacity",
                table: "AspNetUsers");
        }
    }
}
