using Hearsay.Api.Endpoints;
using Hearsay.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add environment variables as configuration
builder.Configuration.AddEnvironmentVariables();

// Services
builder.Services.AddSingleton<DuckDbService>();
builder.Services.AddSingleton<BlobStorageService>();
builder.Services.AddScoped<GameService>();

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

app.UseCors();

// Map endpoints
app.MapRoomEndpoints();
app.MapDrawingEndpoints();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
