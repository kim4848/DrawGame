namespace Hearsay.Api.Models;

public class ChainEntry
{
    public string Id { get; set; } = "";
    public string ChainId { get; set; } = "";
    public int RoundNumber { get; set; }
    public string PlayerId { get; set; } = "";
    public string Type { get; set; } = "";
    public string? Content { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}
