using Daedala.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Daedala;

/// <summary>
/// Design-time factory used by <c>dotnet ef</c>. It avoids booting the full application
/// (which would construct Identity's token providers) and only needs a connection string
/// to build the model against.
/// </summary>
public class DaedalaContextFactory : IDesignTimeDbContextFactory<DaedalaContext>
{
    public DaedalaContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__PostgreSQL")
            ?? "Host=localhost;Database=daedala_design;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<DaedalaContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new DaedalaContext(options);
    }
}
