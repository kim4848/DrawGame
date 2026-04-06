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
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
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
