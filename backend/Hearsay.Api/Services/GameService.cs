using Hearsay.Api.Models;

namespace Hearsay.Api.Services;

public class GameService
{
    private readonly DuckDbService _db;
    private readonly BlobStorageService _blob;
    private static readonly char[] CodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".ToCharArray();

    public GameService(DuckDbService db, BlobStorageService blob)
    {
        _db = db;
        _blob = blob;
    }

    public async Task<(Room Room, Player Player)> CreateRoom(string hostName)
    {
        var roomId = Guid.NewGuid().ToString("N");
        var playerId = Guid.NewGuid().ToString("N");
        var code = await GenerateUniqueCode();

        var room = new Room
        {
            Id = roomId,
            Code = code,
            HostId = playerId,
            Status = "LOBBY",
            NumPlayers = 0,
            CreatedAt = DateTime.UtcNow
        };

        var player = new Player
        {
            Id = playerId,
            RoomId = roomId,
            Name = hostName,
            LastSeenAt = DateTime.UtcNow,
            JoinedAt = DateTime.UtcNow
        };

        await _db.CreateRoom(room);
        await _db.AddPlayer(player);

        return (room, player);
    }

    public async Task<(Room Room, Player Player)?> JoinRoom(string code, string playerName)
    {
        var room = await _db.GetRoomByCode(code);
        if (room == null || room.Status != "LOBBY")
            return null;

        var playerId = Guid.NewGuid().ToString("N");
        var player = new Player
        {
            Id = playerId,
            RoomId = room.Id,
            Name = playerName,
            LastSeenAt = DateTime.UtcNow,
            JoinedAt = DateTime.UtcNow
        };

        await _db.AddPlayer(player);
        return (room, player);
    }

    public async Task<bool> StartGame(string roomId, string playerId)
    {
        var room = await _db.GetRoomById(roomId);
        if (room == null || room.Status != "LOBBY" || room.HostId != playerId)
            return false;

        var players = await _db.GetPlayersByRoom(roomId);
        if (players.Count < 2)
            return false;

        await _db.UpdateRoomNumPlayers(roomId, players.Count);

        // Create one chain per player
        foreach (var player in players)
        {
            var chain = new Chain
            {
                Id = Guid.NewGuid().ToString("N"),
                RoomId = roomId,
                OriginPlayerId = player.Id,
                CurrentRound = 0
            };
            await _db.CreateChain(chain);
        }

        await _db.UpdateRoomStatus(roomId, "ACTIVE");
        return true;
    }

    public async Task<PollResponse?> GetPollData(string roomId, string playerId)
    {
        var room = await _db.GetRoomById(roomId);
        if (room == null) return null;

        await _db.UpdateLastSeen(playerId);

        var players = await _db.GetPlayersByRoom(roomId);
        var chains = await _db.GetChainsByRoom(roomId);

        int currentRound = chains.Count > 0 ? chains[0].CurrentRound : 0;
        string? roundType = null;
        AssignmentDto? assignment = null;
        bool allSubmitted = false;
        bool hasSubmitted = false;

        if (room.Status == "ACTIVE" && chains.Count > 0)
        {
            roundType = GetRoundType(currentRound);

            // Find this player's assignment
            int playerIndex = players.FindIndex(p => p.Id == playerId);
            if (playerIndex >= 0)
            {
                int n = players.Count;
                // R0 and R1: own chain. R≥2: chain flows right with offset (R-1)
                int chainOwnerIndex = currentRound <= 1
                    ? playerIndex
                    : ((playerIndex - (currentRound - 1)) % n + n) % n;
                var assignedChain = chains.FirstOrDefault(c => c.OriginPlayerId == players[chainOwnerIndex].Id);

                if (assignedChain != null)
                {
                    string? content = null;
                    if (currentRound > 0)
                    {
                        var entries = await _db.GetEntriesByChainId(assignedChain.Id);
                        var prevEntry = entries.FirstOrDefault(e => e.RoundNumber == currentRound - 1);
                        content = prevEntry?.Content;

                        // For GUESS rounds, the previous entry is a drawing — generate a readable URL
                        if (roundType == "GUESS" && content != null)
                        {
                            content = _blob.GetSasUrl(content, TimeSpan.FromHours(1));
                        }
                    }
                    assignment = new AssignmentDto(assignedChain.Id, content);
                }

                hasSubmitted = await _db.HasPlayerSubmittedForRound(roomId, playerId, currentRound);
            }

            int submittedCount = await _db.CountEntriesForRound(roomId, currentRound);
            allSubmitted = submittedCount >= room.NumPlayers;

            // Server-side timeout: auto-submit for inactive players
            if (!allSubmitted && room.RoundStartedAt.HasValue)
            {
                int timeoutSeconds = roundType == "DRAW" ? 95 : 35; // timer + 5s grace
                if ((DateTime.UtcNow - room.RoundStartedAt.Value).TotalSeconds > timeoutSeconds)
                {
                    foreach (var p in players)
                    {
                        bool isInactive = (DateTime.UtcNow - p.LastSeenAt).TotalSeconds > 30;
                        if (!isInactive) continue;

                        bool pSubmitted = await _db.HasPlayerSubmittedForRound(roomId, p.Id, currentRound);
                        if (pSubmitted) continue;

                        // Find this player's assigned chain
                        int pIndex = players.FindIndex(pl => pl.Id == p.Id);
                        int n = players.Count;
                        int chainOwnerIndex = currentRound <= 1
                            ? pIndex
                            : ((pIndex - (currentRound - 1)) % n + n) % n;
                        var pChain = chains.FirstOrDefault(c => c.OriginPlayerId == players[chainOwnerIndex].Id);
                        if (pChain == null) continue;

                        string autoContent = roundType switch
                        {
                            "WORD" => "(intet ord)",
                            "DRAW" => "(tom tegning)",
                            _ => "(intet gæt)"
                        };

                        var entry = new ChainEntry
                        {
                            Id = Guid.NewGuid().ToString("N"),
                            ChainId = pChain.Id,
                            RoundNumber = currentRound,
                            PlayerId = p.Id,
                            Type = roundType ?? "GUESS",
                            Content = autoContent,
                            SubmittedAt = DateTime.UtcNow
                        };
                        await _db.AddChainEntry(entry);
                        submittedCount++;
                    }

                    // Check if round should advance after auto-submits
                    if (submittedCount >= room.NumPlayers)
                    {
                        int nextRound = currentRound + 1;
                        if (nextRound > room.NumPlayers)
                        {
                            await _db.UpdateRoomStatus(roomId, "REVEAL");
                            room = (await _db.GetRoomById(roomId))!;
                        }
                        else
                        {
                            await _db.AdvanceRound(roomId);
                        }
                        allSubmitted = true;
                    }
                }
            }
        }

        var playerDtos = new List<PlayerDto>();
        foreach (var p in players)
        {
            bool pSubmitted = room.Status == "ACTIVE"
                ? await _db.HasPlayerSubmittedForRound(roomId, p.Id, currentRound)
                : false;
            bool isActive = (DateTime.UtcNow - p.LastSeenAt).TotalSeconds < 30;
            playerDtos.Add(new PlayerDto(p.Id, p.Name, pSubmitted, isActive));
        }

        return new PollResponse(
            room.Status,
            currentRound,
            players.Count,
            roundType,
            playerDtos,
            assignment,
            allSubmitted,
            hasSubmitted
        );
    }

    public async Task<bool> Submit(string roomId, string playerId, string chainId, int round, string type, string content)
    {
        var room = await _db.GetRoomById(roomId);
        if (room == null || room.Status != "ACTIVE")
            return false;

        // Check if already submitted
        if (await _db.HasPlayerSubmittedForRound(roomId, playerId, round))
            return false;

        var entry = new ChainEntry
        {
            Id = Guid.NewGuid().ToString("N"),
            ChainId = chainId,
            RoundNumber = round,
            PlayerId = playerId,
            Type = type,
            Content = content,
            SubmittedAt = DateTime.UtcNow
        };

        await _db.AddChainEntry(entry);

        // Check if all players submitted
        int submittedCount = await _db.CountEntriesForRound(roomId, round);
        if (submittedCount >= room.NumPlayers)
        {
            int nextRound = round + 1;
            if (nextRound > room.NumPlayers)
            {
                await _db.UpdateRoomStatus(roomId, "REVEAL");
            }
            else
            {
                await _db.AdvanceRound(roomId);
            }
        }

        return true;
    }

    public async Task<(Room Room, Player Player)?> RejoinRoom(string code, string playerId)
    {
        var room = await _db.GetRoomByCode(code);
        if (room == null || room.Status == "DONE")
            return null;

        var player = await _db.GetPlayerById(playerId);
        if (player == null || player.RoomId != room.Id)
            return null;

        await _db.UpdateLastSeen(playerId);
        return (room, player);
    }

    public async Task<RevealResponse?> GetRevealData(string roomId)
    {
        var room = await _db.GetRoomById(roomId);
        if (room == null) return null;

        var players = await _db.GetPlayersByRoom(roomId);
        var chains = await _db.GetChainsByRoom(roomId);
        var playerMap = players.ToDictionary(p => p.Id, p => p.Name);

        var chainReveals = new List<ChainRevealDto>();
        foreach (var chain in chains)
        {
            var entries = await _db.GetEntriesByChainId(chain.Id);
            var entryDtos = entries.Select(e => new ChainEntryRevealDto(
                e.RoundNumber,
                e.Type,
                e.Type == "DRAW" ? _blob.GetSasUrl(e.Content, TimeSpan.FromHours(1)) : e.Content,
                playerMap.GetValueOrDefault(e.PlayerId, "???")
            )).ToList();

            var originName = playerMap.GetValueOrDefault(chain.OriginPlayerId, "???");
            chainReveals.Add(new ChainRevealDto(originName, entryDtos));
        }

        return new RevealResponse(chainReveals);
    }

    public async Task<RoomStateResponse?> GetRoomState(string code)
    {
        var room = await _db.GetRoomByCode(code);
        if (room == null) return null;

        var players = await _db.GetPlayersByRoom(room.Id);
        var playerDtos = players.Select(p => new PlayerDto(
            p.Id, p.Name, false,
            (DateTime.UtcNow - p.LastSeenAt).TotalSeconds < 30
        )).ToList();

        return new RoomStateResponse(room.Id, room.Code, room.Status, room.HostId, playerDtos);
    }

    private static string GetRoundType(int round)
    {
        if (round == 0) return "WORD";
        return round % 2 == 1 ? "DRAW" : "GUESS";
    }

    private async Task<string> GenerateUniqueCode()
    {
        var random = Random.Shared;
        string code;
        do
        {
            code = new string(Enumerable.Range(0, 6).Select(_ => CodeChars[random.Next(CodeChars.Length)]).ToArray());
        } while (!await _db.IsCodeUnique(code));
        return code;
    }
}
