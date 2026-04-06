namespace Hearsay.Api.Models;

public record CreateRoomRequest(string Name);
public record CreateRoomResponse(string RoomId, string RoomCode, string PlayerId);

public record JoinRoomRequest(string Name);
public record JoinRoomResponse(string RoomId, string PlayerId);

public record RejoinRequest(string PlayerId);
public record RejoinResponse(string RoomId, string Status);

public record StartGameRequest(string PlayerId, int? DrawTimer = null, int? GuessTimer = null);

public record SubmitRequest(string PlayerId, string ChainId, int Round, string Type, string Content);

public record PlayerDto(string Id, string Name, bool HasSubmitted, bool IsActive);

public record AssignmentDto(string ChainId, string? Content);

public record PollResponse(
    string Status,
    int CurrentRound,
    int TotalRounds,
    string? RoundType,
    List<PlayerDto> Players,
    AssignmentDto? Assignment,
    bool AllSubmitted,
    bool HasSubmitted,
    int DrawTimer = 90,
    int GuessTimer = 30,
    string? NextRoomCode = null
);

public record RoomStateResponse(string RoomId, string Code, string Status, string HostId, List<PlayerDto> Players);

public record ChainEntryRevealDto(int RoundNumber, string Type, string? Content, string PlayerName);
public record ChainRevealDto(string OriginPlayerName, List<ChainEntryRevealDto> Entries);
public record RevealResponse(List<ChainRevealDto> Chains);

public record PlayAgainRequest(string PlayerId);
public record PlayAgainResponse(string RoomId, string RoomCode, string PlayerId);

public record UploadResponse(string BlobUrl);
