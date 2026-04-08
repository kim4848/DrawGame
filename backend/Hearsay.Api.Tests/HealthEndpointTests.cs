using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Hearsay.Api.Tests;

public class HealthEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHealth_ReturnsStructuredHealthStatus()
    {
        // Act
        var response = await _client.GetAsync("/health");
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();

        // Assert
        health.Should().NotBeNull();
        health!.Status.Should().NotBeNullOrEmpty();
        health.Components.Should().NotBeNull();
    }

    [Fact]
    public async Task GetHealth_IncludesDuckDbStatus()
    {
        // Act
        var response = await _client.GetAsync("/health");
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();

        // Assert
        health!.Components.Should().ContainKey("duckdb");
        health.Components["duckdb"].Should().NotBeNull();
        health.Components["duckdb"].Status.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetHealth_IncludesAzureBlobStorageStatus()
    {
        // Act
        var response = await _client.GetAsync("/health");
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();

        // Assert
        health!.Components.Should().ContainKey("azure_blob_storage");
        health.Components["azure_blob_storage"].Should().NotBeNull();
        health.Components["azure_blob_storage"].Status.Should().NotBeNullOrEmpty();
    }
}

public record HealthResponse(
    string Status,
    Dictionary<string, ComponentHealth> Components
);

public record ComponentHealth(
    string Status,
    string? Message = null
);
