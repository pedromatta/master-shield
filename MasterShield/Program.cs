using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Implementations;
using MasterShield.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("PostgreSQL");

builder.Services.AddDbContext<MasterShieldContext>(options => options.UseNpgsql(connectionString));

// Accounts are managed by ASP.NET Core Identity so passwords are hashed with the
// framework KDF and the credential store is standard. No auth pipeline is wired yet:
// this is a local table tool, so identity is used for account management only.
builder.Services
    .AddIdentityCore<User>(options =>
    {
        options.User.RequireUniqueEmail = false;
        options.Password.RequiredLength = 6;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireDigit = false;
    })
    .AddEntityFrameworkStores<MasterShieldContext>()
    .AddDefaultTokenProviders();

builder.Services.AddDataProtection();

// Navigation properties are populated by EF Core, never by clients. Without disabling
// implicit required-validation for non-nullable reference types, ASP.NET rejects every
// create payload that (correctly) sends only foreign keys.
builder.Services.AddControllers(options =>
{
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
})
.AddJsonOptions(options =>
{
    // Enums such as ActorType are part of the public contract; the client sends and
    // expects their names, not their underlying ordinals.
    options.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});

builder.Services.AddScoped<ICampaignService, CampaignService>();
builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();

// The stable map endpoint streams remote location images server-side so virtual tabletops
// receive the bytes directly instead of a redirect they handle poorly.
builder.Services.AddHttpClient("map-image", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddScoped<IActorService, ActorService>();
builder.Services.AddScoped<IEncounterService, EncounterService>();
builder.Services.AddScoped<IBlueprintService, BlueprintService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddScoped<ICounterService, CounterService>();
builder.Services.AddScoped<IRuleService, RuleService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<ISystemEntityService, SystemEntityService>();

// Browser origins allowed to call the API. Defaults cover the Angular dev server; the
// CORS_ORIGINS environment variable overrides them for container deployments.
const string devCorsPolicy = "MasterShieldDev";
var allowedOrigins = (builder.Configuration["CORS_ORIGINS"] ?? "http://localhost:4200,https://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options => options.AddPolicy(
    devCorsPolicy,
    policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

// Ensure the web root and uploads directory exist before the static-file middleware
// resolves its file provider; otherwise uploads written after startup would not be served.
var webRoot = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(webRoot, "uploads"));
app.Environment.WebRootPath = webRoot;

// Keep the schema in step with the migrations so a fresh checkout is usable without a
// manual `dotnet ef database update` step.
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<MasterShieldContext>().Database;
    database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(devCorsPolicy);

// Serve uploaded assets (portraits, maps, category icons, attachments) directly from
// wwwroot so the URIs persisted on entities resolve without an extra round trip.
app.UseStaticFiles();

app.MapControllers();

app.Run();
