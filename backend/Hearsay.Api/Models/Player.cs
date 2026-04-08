namespace Hearsay.Api.Models;

public class Player
{
    public string Id { get; set; } = "";
    public string RoomId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? UserId { get; set; }
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
