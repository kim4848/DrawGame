using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Hearsay.Api.Tests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Override with test-specific configuration
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DB_PATH"] = ":memory:",  // Use in-memory DuckDB for tests
                ["AZURE_BLOB_CONNECTION_STRING"] = "",  // Use local storage instead of Azure
                ["LOCAL_BLOB_PATH"] = Path.Combine(Path.GetTempPath(), "hearsay-test-uploads"),
                ["JWT_SECRET"] = "test-secret-key-for-jwt-authentication-must-be-at-least-32-chars"
            });
        });
    }
}
