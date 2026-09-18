using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Daedala.Migrations
{
    /// <inheritdoc />
    public partial class ActorOverviewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OverviewFields",
                table: "Actors",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OverviewFields",
                table: "Actors");
        }
    }
}
