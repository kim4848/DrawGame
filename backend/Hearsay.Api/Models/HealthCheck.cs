namespace Hearsay.Api.Models;

public record HealthCheckResponse(
    string Status,
    Dictionary<string, ComponentHealth> Components
);

public record ComponentHealth(
    string Status,
    string? Message = null
);
