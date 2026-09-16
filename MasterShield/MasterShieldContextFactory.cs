using MasterShield.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MasterShield;

/// <summary>
/// Design-time factory used by <c>dotnet ef</c>. It avoids booting the full application
/// (which would construct Identity's token providers) and only needs a connection string
/// to build the model against.
/// </summary>
public class MasterShieldContextFactory : IDesignTimeDbContextFactory<MasterShieldContext>
{
    public MasterShieldContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__PostgreSQL")
            ?? "Host=localhost;Database=master_shield_design;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<MasterShieldContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new MasterShieldContext(options);
    }
}
