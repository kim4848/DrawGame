namespace Hearsay.Api.Models;

public class Chain
{
    public string Id { get; set; } = "";
    public string RoomId { get; set; } = "";
    public string OriginPlayerId { get; set; } = "";
    public int CurrentRound { get; set; }
}
