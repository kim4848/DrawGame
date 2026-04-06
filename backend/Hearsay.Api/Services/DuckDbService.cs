using DuckDB.NET.Data;
using Hearsay.Api.Models;

namespace Hearsay.Api.Services;

public class DuckDbService : IDisposable
{
    private readonly DuckDBConnection _connection;
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public DuckDbService(IConfiguration config)
    {
        var dbPath = config["DB_PATH"] ?? "hearsay.duckdb";
        _connection = new DuckDBConnection($"Data Source={dbPath}");
        _connection.Open();
    }

    public async Task InitializeAsync()
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS rooms (
                    id               VARCHAR PRIMARY KEY,
                    code             VARCHAR UNIQUE NOT NULL,
                    host_id          VARCHAR NOT NULL,
                    status           VARCHAR NOT NULL,
                    num_players      INTEGER DEFAULT 0,
                    created_at       TIMESTAMP DEFAULT current_timestamp,
                    round_started_at TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS players (
                    id            VARCHAR PRIMARY KEY,
                    room_id       VARCHAR NOT NULL,
                    name          VARCHAR NOT NULL,
                    last_seen_at  TIMESTAMP DEFAULT current_timestamp,
                    joined_at     TIMESTAMP DEFAULT current_timestamp
                );

                CREATE TABLE IF NOT EXISTS chains (
                    id                VARCHAR PRIMARY KEY,
                    room_id           VARCHAR NOT NULL,
                    origin_player_id  VARCHAR NOT NULL,
                    current_round     INTEGER DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS chain_entries (
                    id           VARCHAR PRIMARY KEY,
                    chain_id     VARCHAR NOT NULL,
                    round_number INTEGER NOT NULL,
                    player_id    VARCHAR NOT NULL,
                    type         VARCHAR NOT NULL,
                    content      VARCHAR,
                    submitted_at TIMESTAMP DEFAULT current_timestamp,
                    UNIQUE(chain_id, round_number)
                );
            ";
            await cmd.ExecuteNonQueryAsync();

            // Migrations: add columns if missing (existing databases)
            using var migCmd = _connection.CreateCommand();
            migCmd.CommandText = @"
                ALTER TABLE rooms ADD COLUMN IF NOT EXISTS round_started_at TIMESTAMP;
                ALTER TABLE rooms ADD COLUMN IF NOT EXISTS draw_timer INTEGER DEFAULT 90;
                ALTER TABLE rooms ADD COLUMN IF NOT EXISTS guess_timer INTEGER DEFAULT 30;
                ALTER TABLE rooms ADD COLUMN IF NOT EXISTS next_room_code VARCHAR;
            ";
            await migCmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    // Room operations

    public async Task CreateRoom(Room room)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT INTO rooms (id, code, host_id, status, num_players, created_at) VALUES ($id, $code, $host_id, $status, $num_players, $created_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", room.Id));
            cmd.Parameters.Add(new DuckDBParameter("code", room.Code));
            cmd.Parameters.Add(new DuckDBParameter("host_id", room.HostId));
            cmd.Parameters.Add(new DuckDBParameter("status", room.Status));
            cmd.Parameters.Add(new DuckDBParameter("num_players", room.NumPlayers));
            cmd.Parameters.Add(new DuckDBParameter("created_at", room.CreatedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<Room?> GetRoomByCode(string code)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, code, host_id, status, num_players, created_at, round_started_at, draw_timer, guess_timer, next_room_code FROM rooms WHERE code = $code";
        cmd.Parameters.Add(new DuckDBParameter("code", code));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Room
            {
                Id = reader.GetString(0),
                Code = reader.GetString(1),
                HostId = reader.GetString(2),
                Status = reader.GetString(3),
                NumPlayers = reader.GetInt32(4),
                CreatedAt = reader.GetDateTime(5),
                RoundStartedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                DrawTimer = reader.IsDBNull(7) ? 90 : reader.GetInt32(7),
                GuessTimer = reader.IsDBNull(8) ? 30 : reader.GetInt32(8),
                NextRoomCode = reader.IsDBNull(9) ? null : reader.GetString(9)
            };
        }
        return null;
    }

    public async Task<Room?> GetRoomById(string id)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, code, host_id, status, num_players, created_at, round_started_at, draw_timer, guess_timer, next_room_code FROM rooms WHERE id = $id";
        cmd.Parameters.Add(new DuckDBParameter("id", id));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Room
            {
                Id = reader.GetString(0),
                Code = reader.GetString(1),
                HostId = reader.GetString(2),
                Status = reader.GetString(3),
                NumPlayers = reader.GetInt32(4),
                CreatedAt = reader.GetDateTime(5),
                RoundStartedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                DrawTimer = reader.IsDBNull(7) ? 90 : reader.GetInt32(7),
                GuessTimer = reader.IsDBNull(8) ? 30 : reader.GetInt32(8),
                NextRoomCode = reader.IsDBNull(9) ? null : reader.GetString(9)
            };
        }
        return null;
    }

    public async Task UpdateRoomStatus(string id, string status)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            if (status == "ACTIVE")
            {
                cmd.CommandText = "UPDATE rooms SET status = $status, round_started_at = current_timestamp WHERE id = $id";
            }
            else
            {
                cmd.CommandText = "UPDATE rooms SET status = $status WHERE id = $id";
            }
            cmd.Parameters.Add(new DuckDBParameter("id", id));
            cmd.Parameters.Add(new DuckDBParameter("status", status));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task UpdateNextRoomCode(string id, string nextRoomCode)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE rooms SET next_room_code = $next_room_code WHERE id = $id";
            cmd.Parameters.Add(new DuckDBParameter("id", id));
            cmd.Parameters.Add(new DuckDBParameter("next_room_code", nextRoomCode));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task UpdateRoomTimers(string id, int drawTimer, int guessTimer)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE rooms SET draw_timer = $draw_timer, guess_timer = $guess_timer WHERE id = $id";
            cmd.Parameters.Add(new DuckDBParameter("id", id));
            cmd.Parameters.Add(new DuckDBParameter("draw_timer", drawTimer));
            cmd.Parameters.Add(new DuckDBParameter("guess_timer", guessTimer));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task UpdateRoomNumPlayers(string id, int count)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE rooms SET num_players = $count WHERE id = $id";
            cmd.Parameters.Add(new DuckDBParameter("id", id));
            cmd.Parameters.Add(new DuckDBParameter("count", count));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    // Player operations

    public async Task AddPlayer(Player player)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT INTO players (id, room_id, name, last_seen_at, joined_at) VALUES ($id, $room_id, $name, $last_seen_at, $joined_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", player.Id));
            cmd.Parameters.Add(new DuckDBParameter("room_id", player.RoomId));
            cmd.Parameters.Add(new DuckDBParameter("name", player.Name));
            cmd.Parameters.Add(new DuckDBParameter("last_seen_at", player.LastSeenAt));
            cmd.Parameters.Add(new DuckDBParameter("joined_at", player.JoinedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<List<Player>> GetPlayersByRoom(string roomId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, room_id, name, last_seen_at, joined_at FROM players WHERE room_id = $room_id ORDER BY joined_at ASC";
        cmd.Parameters.Add(new DuckDBParameter("room_id", roomId));
        using var reader = await cmd.ExecuteReaderAsync();
        var players = new List<Player>();
        while (await reader.ReadAsync())
        {
            players.Add(new Player
            {
                Id = reader.GetString(0),
                RoomId = reader.GetString(1),
                Name = reader.GetString(2),
                LastSeenAt = reader.GetDateTime(3),
                JoinedAt = reader.GetDateTime(4)
            });
        }
        return players;
    }

    public async Task<Player?> GetPlayerById(string id)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, room_id, name, last_seen_at, joined_at FROM players WHERE id = $id";
        cmd.Parameters.Add(new DuckDBParameter("id", id));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Player
            {
                Id = reader.GetString(0),
                RoomId = reader.GetString(1),
                Name = reader.GetString(2),
                LastSeenAt = reader.GetDateTime(3),
                JoinedAt = reader.GetDateTime(4)
            };
        }
        return null;
    }

    public async Task UpdateLastSeen(string playerId)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE players SET last_seen_at = current_timestamp WHERE id = $id";
            cmd.Parameters.Add(new DuckDBParameter("id", playerId));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    // Chain operations

    public async Task CreateChain(Chain chain)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT INTO chains (id, room_id, origin_player_id, current_round) VALUES ($id, $room_id, $origin_player_id, $current_round)";
            cmd.Parameters.Add(new DuckDBParameter("id", chain.Id));
            cmd.Parameters.Add(new DuckDBParameter("room_id", chain.RoomId));
            cmd.Parameters.Add(new DuckDBParameter("origin_player_id", chain.OriginPlayerId));
            cmd.Parameters.Add(new DuckDBParameter("current_round", chain.CurrentRound));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<List<Chain>> GetChainsByRoom(string roomId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, room_id, origin_player_id, current_round FROM chains WHERE room_id = $room_id";
        cmd.Parameters.Add(new DuckDBParameter("room_id", roomId));
        using var reader = await cmd.ExecuteReaderAsync();
        var chains = new List<Chain>();
        while (await reader.ReadAsync())
        {
            chains.Add(new Chain
            {
                Id = reader.GetString(0),
                RoomId = reader.GetString(1),
                OriginPlayerId = reader.GetString(2),
                CurrentRound = reader.GetInt32(3)
            });
        }
        return chains;
    }

    // Chain entry operations

    public async Task AddChainEntry(ChainEntry entry)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT INTO chain_entries (id, chain_id, round_number, player_id, type, content, submitted_at) VALUES ($id, $chain_id, $round_number, $player_id, $type, $content, $submitted_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", entry.Id));
            cmd.Parameters.Add(new DuckDBParameter("chain_id", entry.ChainId));
            cmd.Parameters.Add(new DuckDBParameter("round_number", entry.RoundNumber));
            cmd.Parameters.Add(new DuckDBParameter("player_id", entry.PlayerId));
            cmd.Parameters.Add(new DuckDBParameter("type", entry.Type));
            cmd.Parameters.Add(new DuckDBParameter("content", entry.Content));
            cmd.Parameters.Add(new DuckDBParameter("submitted_at", entry.SubmittedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<List<ChainEntry>> GetEntriesByChainId(string chainId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, chain_id, round_number, player_id, type, content, submitted_at FROM chain_entries WHERE chain_id = $chain_id ORDER BY round_number ASC";
        cmd.Parameters.Add(new DuckDBParameter("chain_id", chainId));
        using var reader = await cmd.ExecuteReaderAsync();
        var entries = new List<ChainEntry>();
        while (await reader.ReadAsync())
        {
            entries.Add(new ChainEntry
            {
                Id = reader.GetString(0),
                ChainId = reader.GetString(1),
                RoundNumber = reader.GetInt32(2),
                PlayerId = reader.GetString(3),
                Type = reader.GetString(4),
                Content = reader.IsDBNull(5) ? null : reader.GetString(5),
                SubmittedAt = reader.GetDateTime(6)
            });
        }
        return entries;
    }

    public async Task<int> CountEntriesForRound(string roomId, int round)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            SELECT COUNT(*) FROM chain_entries ce
            JOIN chains c ON ce.chain_id = c.id
            WHERE c.room_id = $room_id AND ce.round_number = $round";
        cmd.Parameters.Add(new DuckDBParameter("room_id", roomId));
        cmd.Parameters.Add(new DuckDBParameter("round", round));
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task<bool> HasPlayerSubmittedForRound(string roomId, string playerId, int round)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            SELECT COUNT(*) FROM chain_entries ce
            JOIN chains c ON ce.chain_id = c.id
            WHERE c.room_id = $room_id AND ce.player_id = $player_id AND ce.round_number = $round";
        cmd.Parameters.Add(new DuckDBParameter("room_id", roomId));
        cmd.Parameters.Add(new DuckDBParameter("player_id", playerId));
        cmd.Parameters.Add(new DuckDBParameter("round", round));
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result) > 0;
    }

    public async Task AdvanceRound(string roomId)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE chains SET current_round = current_round + 1 WHERE room_id = $room_id";
            cmd.Parameters.Add(new DuckDBParameter("room_id", roomId));
            await cmd.ExecuteNonQueryAsync();

            using var cmd2 = _connection.CreateCommand();
            cmd2.CommandText = "UPDATE rooms SET round_started_at = current_timestamp WHERE id = $room_id";
            cmd2.Parameters.Add(new DuckDBParameter("room_id", roomId));
            await cmd2.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<List<(string Content, string Word)>> GetRandomDrawings(int count)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            SELECT ce.content, prev.content AS word
            FROM chain_entries ce
            JOIN chain_entries prev ON prev.chain_id = ce.chain_id AND prev.round_number = ce.round_number - 1
            WHERE ce.type = 'DRAW' AND prev.type IN ('WORD', 'GUESS') AND ce.content IS NOT NULL
            ORDER BY RANDOM()
            LIMIT $count";
        cmd.Parameters.Add(new DuckDBParameter("count", count));
        using var reader = await cmd.ExecuteReaderAsync();
        var results = new List<(string Content, string Word)>();
        while (await reader.ReadAsync())
        {
            var content = reader.GetString(0);
            var word = reader.IsDBNull(1) ? "" : reader.GetString(1);
            results.Add((content, word));
        }
        return results;
    }

    public async Task<bool> IsCodeUnique(string code)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM rooms WHERE code = $code";
        cmd.Parameters.Add(new DuckDBParameter("code", code));
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result) == 0;
    }

    public void Dispose()
    {
        _writeLock.Dispose();
        _connection.Dispose();
    }
}
