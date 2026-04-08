using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Hearsay.Api.Tests;

public class AuthEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("12345678", "Adgangskoden skal indeholde mindst ét stort bogstav")]
    [InlineData("abcdefgh", "Adgangskoden skal indeholde mindst ét stort bogstav")]
    [InlineData("ABCDEFGH", "Adgangskoden skal indeholde mindst ét lille bogstav")]
    [InlineData("Abcdefgh", "Adgangskoden skal indeholde mindst ét tal")]
    [InlineData("short1A", "Adgangskoden skal være mindst 8 tegn")]
    public async Task Register_WithWeakPassword_ReturnsBadRequest(string password, string expectedError)
    {
        // Arrange
        var request = new
        {
            email = "test@example.com",
            password = password,
            displayName = "Test User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains(expectedError, error.error);
    }

    [Fact]
    public async Task Register_WithStrongPassword_ReturnsOk()
    {
        // Arrange
        var request = new
        {
            email = $"test{Guid.NewGuid()}@example.com",
            password = "StrongPass123",
            displayName = "Test User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(result);
        Assert.NotNull(result.token);
        Assert.NotNull(result.user);
    }

    private record ErrorResponse(string error);
    private record AuthResponse(string token, UserInfo user);
    private record UserInfo(string id, string email, string? displayName);
}
