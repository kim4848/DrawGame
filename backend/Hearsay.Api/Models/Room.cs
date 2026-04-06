namespace Hearsay.Api.Models;

public class Room
{
    public string Id { get; set; } = "";
    public string Code { get; set; } = "";
    public string HostId { get; set; } = "";
    public string Status { get; set; } = "LOBBY";
    public int NumPlayers { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RoundStartedAt { get; set; }
}
