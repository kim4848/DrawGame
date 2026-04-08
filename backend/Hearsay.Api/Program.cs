using System.Text;
using Hearsay.Api.Endpoints;
using Hearsay.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add environment variables as configuration
builder.Configuration.AddEnvironmentVariables();

// Services
builder.Services.AddSingleton<DuckDbService>();
builder.Services.AddSingleton<BlobStorageService>();
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<PaymentService>();
builder.Services.AddSingleton<WordPackService>();
builder.Services.AddScoped<GameService>();

// JWT Authentication
builder.Services.AddAuthorization();
var jwtSecret = builder.Configuration["JWT_SECRET"];
if (!string.IsNullOrEmpty(jwtSecret))
{
    var authService = new AuthService(builder.Configuration);
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = authService.GetIssuer(),
                ValidAudience = authService.GetAudience(),
                IssuerSigningKey = authService.GetSigningKey()
            };
        });
}

// CORS
var allowedOrigins = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',')
    ?? new[] { "https://apps.kjsoft.dk", "http://localhost:3000", "http://localhost:8083" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Initialize DB
var db = app.Services.GetRequiredService<DuckDbService>();
await db.InitializeAsync();

// Seed word packs
var wordPackService = app.Services.GetRequiredService<WordPackService>();
await wordPackService.SeedDefaultPacks();

app.UseCors();

// Only use authentication if JWT is configured
if (!string.IsNullOrEmpty(jwtSecret))
{
    app.UseAuthentication();
}

app.UseAuthorization();

// Map endpoints
app.MapAuthEndpoints();
app.MapPaymentEndpoints();
app.MapWordPackEndpoints();
app.MapRoomEndpoints();
app.MapDrawingEndpoints();
app.MapGet("/health", async (DuckDbService duckDb, BlobStorageService blobStorage) =>
{
    var (duckDbHealthy, duckDbMessage) = await duckDb.CheckHealthAsync();
    var (blobHealthy, blobMessage) = await blobStorage.CheckHealthAsync();

    var components = new Dictionary<string, Hearsay.Api.Models.ComponentHealth>
    {
        ["duckdb"] = new(duckDbHealthy ? "healthy" : "unhealthy", duckDbMessage),
        ["azure_blob_storage"] = new(blobHealthy ? "healthy" : "unhealthy", blobMessage)
    };

    var overallStatus = duckDbHealthy && blobHealthy ? "healthy" : "degraded";
    return Results.Ok(new Hearsay.Api.Models.HealthCheckResponse(overallStatus, components));
});

app.Run();

// Make Program accessible to tests
public partial class Program { }
