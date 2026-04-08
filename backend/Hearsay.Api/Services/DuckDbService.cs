using DuckDB.NET.Data;
using Hearsay.Api.Models;
using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace Hearsay.Api.Services;

public class DuckDbService : IDisposable
{
    private readonly DuckDBConnection _connection;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly ConcurrentDictionary<string, DateTime> _lastSeenBatch = new();
    private readonly Timer _batchFlushTimer;
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    public DuckDbService(IConfiguration config)
    {
        var dbPath = config["DB_PATH"] ?? "hearsay.duckdb";
        _connection = new DuckDBConnection($"Data Source={dbPath}");
        _connection.Open();

        // Batch flush timer: flush last_seen updates every 5 seconds
        _batchFlushTimer = new Timer(async _ => await FlushLastSeenBatch(), null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));
    }

    public async Task<(bool isHealthy, string? message)> CheckHealthAsync()
    {
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT 1";
            await cmd.ExecuteScalarAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    public async Task InitializeAsync()
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS users (
                    id            VARCHAR PRIMARY KEY,
                    email         VARCHAR UNIQUE NOT NULL,
                    password_hash VARCHAR NOT NULL,
                    display_name  VARCHAR,
                    created_at    TIMESTAMP DEFAULT current_timestamp,
                    last_login_at TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS subscriptions (
                    id                      VARCHAR PRIMARY KEY,
                    user_id                 VARCHAR NOT NULL UNIQUE,
                    stripe_customer_id      VARCHAR NOT NULL,
                    stripe_subscription_id  VARCHAR,
                    status                  VARCHAR NOT NULL DEFAULT 'free',
                    current_period_start    TIMESTAMP,
                    current_period_end      TIMESTAMP,
                    created_at              TIMESTAMP DEFAULT current_timestamp,
                    updated_at              TIMESTAMP DEFAULT current_timestamp
                );

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
                    user_id       VARCHAR,
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

                CREATE TABLE IF NOT EXISTS word_packs (
                    id          VARCHAR PRIMARY KEY,
                    name        VARCHAR NOT NULL,
                    description VARCHAR NOT NULL,
                    icon_url    VARCHAR,
                    is_premium  BOOLEAN DEFAULT FALSE,
                    is_default  BOOLEAN DEFAULT FALSE,
                    created_at  TIMESTAMP DEFAULT current_timestamp
                );

                CREATE TABLE IF NOT EXISTS words (
                    id         VARCHAR PRIMARY KEY,
                    pack_id    VARCHAR NOT NULL,
                    text       VARCHAR NOT NULL,
                    created_at TIMESTAMP DEFAULT current_timestamp
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
                ALTER TABLE rooms ADD COLUMN IF NOT EXISTS word_pack_id VARCHAR;
                ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id VARCHAR;
            ";
            await migCmd.ExecuteNonQueryAsync();

            // Performance indexes for polling queries
            using var idxCmd = _connection.CreateCommand();
            idxCmd.CommandText = @"
                CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
                CREATE INDEX IF NOT EXISTS idx_chains_room_id ON chains(room_id);
                CREATE INDEX IF NOT EXISTS idx_chain_entries_chain_round ON chain_entries(chain_id, round_number);
                CREATE INDEX IF NOT EXISTS idx_chain_entries_player ON chain_entries(player_id);
            ";
            await idxCmd.ExecuteNonQueryAsync();
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
        cmd.CommandText = "SELECT id, code, host_id, status, num_players, created_at, round_started_at, draw_timer, guess_timer, next_room_code, word_pack_id FROM rooms WHERE code = $code";
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
                NextRoomCode = reader.IsDBNull(9) ? null : reader.GetString(9),
                WordPackId = reader.IsDBNull(10) ? null : reader.GetString(10)
            };
        }
        return null;
    }

    public async Task<Room?> GetRoomById(string id)
    {
        // Cache for 2 seconds - enough to handle multiple polls but still responsive
        var cacheKey = $"room:{id}";
        if (_cache.TryGetValue(cacheKey, out Room? cached))
            return cached;

        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, code, host_id, status, num_players, created_at, round_started_at, draw_timer, guess_timer, next_room_code, word_pack_id FROM rooms WHERE id = $id";
        cmd.Parameters.Add(new DuckDBParameter("id", id));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var room = new Room
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
                NextRoomCode = reader.IsDBNull(9) ? null : reader.GetString(9),
                WordPackId = reader.IsDBNull(10) ? null : reader.GetString(10)
            };
            _cache.Set(cacheKey, room, TimeSpan.FromSeconds(2));
            return room;
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
            _cache.Remove($"room:{id}");
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

    public async Task UpdateRoomWordPack(string id, string wordPackId)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE rooms SET word_pack_id = $word_pack_id WHERE id = $id";
            cmd.Parameters.Add(new DuckDBParameter("id", id));
            cmd.Parameters.Add(new DuckDBParameter("word_pack_id", wordPackId));
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
            cmd.CommandText = "INSERT INTO players (id, room_id, name, user_id, last_seen_at, joined_at) VALUES ($id, $room_id, $name, $user_id, $last_seen_at, $joined_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", player.Id));
            cmd.Parameters.Add(new DuckDBParameter("room_id", player.RoomId));
            cmd.Parameters.Add(new DuckDBParameter("name", player.Name));
            cmd.Parameters.Add(new DuckDBParameter("user_id", (object?)player.UserId ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("last_seen_at", player.LastSeenAt));
            cmd.Parameters.Add(new DuckDBParameter("joined_at", player.JoinedAt));
            await cmd.ExecuteNonQueryAsync();
            _cache.Remove($"players:{player.RoomId}");
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<List<Player>> GetPlayersByRoom(string roomId)
    {
        // Cache for 2 seconds - player list rarely changes during active game
        var cacheKey = $"players:{roomId}";
        if (_cache.TryGetValue(cacheKey, out List<Player>? cached))
            return cached!;

        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, room_id, name, user_id, last_seen_at, joined_at FROM players WHERE room_id = $room_id ORDER BY joined_at ASC";
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
                UserId = reader.IsDBNull(3) ? null : reader.GetString(3),
                LastSeenAt = reader.GetDateTime(4),
                JoinedAt = reader.GetDateTime(5)
            });
        }
        _cache.Set(cacheKey, players, TimeSpan.FromSeconds(2));
        return players;
    }

    public async Task<Player?> GetPlayerById(string id)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, room_id, name, user_id, last_seen_at, joined_at FROM players WHERE id = $id";
        cmd.Parameters.Add(new DuckDBParameter("id", id));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Player
            {
                Id = reader.GetString(0),
                RoomId = reader.GetString(1),
                Name = reader.GetString(2),
                UserId = reader.IsDBNull(3) ? null : reader.GetString(3),
                LastSeenAt = reader.GetDateTime(4),
                JoinedAt = reader.GetDateTime(5)
            };
        }
        return null;
    }

    public Task UpdateLastSeen(string playerId)
    {
        // Batch update - no immediate write
        _lastSeenBatch[playerId] = DateTime.UtcNow;
        return Task.CompletedTask;
    }

    private async Task FlushLastSeenBatch()
    {
        if (_lastSeenBatch.IsEmpty) return;

        // Snapshot and clear the batch
        var updates = _lastSeenBatch.ToArray();
        foreach (var kvp in updates)
        {
            _lastSeenBatch.TryRemove(kvp.Key, out _);
        }

        if (updates.Length == 0) return;

        await _writeLock.WaitAsync();
        try
        {
            foreach (var (playerId, timestamp) in updates)
            {
                using var cmd = _connection.CreateCommand();
                cmd.CommandText = "UPDATE players SET last_seen_at = $timestamp WHERE id = $id";
                cmd.Parameters.Add(new DuckDBParameter("id", playerId));
                cmd.Parameters.Add(new DuckDBParameter("timestamp", timestamp));
                await cmd.ExecuteNonQueryAsync();
            }
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

    public async Task<HashSet<string>> GetSubmittedPlayerIdsForRound(string roomId, int round)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            SELECT DISTINCT ce.player_id FROM chain_entries ce
            JOIN chains c ON ce.chain_id = c.id
            WHERE c.room_id = $room_id AND ce.round_number = $round";
        cmd.Parameters.Add(new DuckDBParameter("room_id", roomId));
        cmd.Parameters.Add(new DuckDBParameter("round", round));
        using var reader = await cmd.ExecuteReaderAsync();
        var playerIds = new HashSet<string>();
        while (await reader.ReadAsync())
        {
            playerIds.Add(reader.GetString(0));
        }
        return playerIds;
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
            _cache.Remove($"room:{roomId}");
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

    // User operations

    public async Task CreateUser(User user)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES ($id, $email, $password_hash, $display_name, $created_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", user.Id));
            cmd.Parameters.Add(new DuckDBParameter("email", user.Email.ToLowerInvariant()));
            cmd.Parameters.Add(new DuckDBParameter("password_hash", user.PasswordHash));
            cmd.Parameters.Add(new DuckDBParameter("display_name", (object?)user.DisplayName ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("created_at", user.CreatedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<User?> GetUserByEmail(string email)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, email, password_hash, display_name, created_at, last_login_at FROM users WHERE email = $email";
        cmd.Parameters.Add(new DuckDBParameter("email", email.ToLowerInvariant()));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new User
            {
                Id = reader.GetString(0),
                Email = reader.GetString(1),
                PasswordHash = reader.GetString(2),
                DisplayName = reader.IsDBNull(3) ? null : reader.GetString(3),
                CreatedAt = reader.GetDateTime(4),
                LastLoginAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5)
            };
        }
        return null;
    }

    public async Task<User?> GetUserById(string id)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, email, password_hash, display_name, created_at, last_login_at FROM users WHERE id = $id";
        cmd.Parameters.Add(new DuckDBParameter("id", id));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new User
            {
                Id = reader.GetString(0),
                Email = reader.GetString(1),
                PasswordHash = reader.GetString(2),
                DisplayName = reader.IsDBNull(3) ? null : reader.GetString(3),
                CreatedAt = reader.GetDateTime(4),
                LastLoginAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5)
            };
        }
        return null;
    }

    public async Task UpdateLastLogin(string userId)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE users SET last_login_at = current_timestamp WHERE id = $id";
            cmd.Parameters.Add(new DuckDBParameter("id", userId));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    // Subscription operations

    public async Task CreateSubscription(Subscription subscription)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, created_at, updated_at)
                VALUES ($id, $user_id, $stripe_customer_id, $stripe_subscription_id, $status, $current_period_start, $current_period_end, $created_at, $updated_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", subscription.Id));
            cmd.Parameters.Add(new DuckDBParameter("user_id", subscription.UserId));
            cmd.Parameters.Add(new DuckDBParameter("stripe_customer_id", subscription.StripeCustomerId));
            cmd.Parameters.Add(new DuckDBParameter("stripe_subscription_id", (object?)subscription.StripeSubscriptionId ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("status", subscription.Status));
            cmd.Parameters.Add(new DuckDBParameter("current_period_start", (object?)subscription.CurrentPeriodStart ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("current_period_end", (object?)subscription.CurrentPeriodEnd ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("created_at", subscription.CreatedAt));
            cmd.Parameters.Add(new DuckDBParameter("updated_at", subscription.UpdatedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<Subscription?> GetSubscriptionByUserId(string userId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, created_at, updated_at
            FROM subscriptions WHERE user_id = $user_id";
        cmd.Parameters.Add(new DuckDBParameter("user_id", userId));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Subscription
            {
                Id = reader.GetString(0),
                UserId = reader.GetString(1),
                StripeCustomerId = reader.GetString(2),
                StripeSubscriptionId = reader.IsDBNull(3) ? null : reader.GetString(3),
                Status = reader.GetString(4),
                CurrentPeriodStart = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                CurrentPeriodEnd = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                CreatedAt = reader.GetDateTime(7),
                UpdatedAt = reader.GetDateTime(8)
            };
        }
        return null;
    }

    public async Task<Subscription?> GetSubscriptionByStripeCustomerId(string stripeCustomerId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, created_at, updated_at
            FROM subscriptions WHERE stripe_customer_id = $stripe_customer_id";
        cmd.Parameters.Add(new DuckDBParameter("stripe_customer_id", stripeCustomerId));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Subscription
            {
                Id = reader.GetString(0),
                UserId = reader.GetString(1),
                StripeCustomerId = reader.GetString(2),
                StripeSubscriptionId = reader.IsDBNull(3) ? null : reader.GetString(3),
                Status = reader.GetString(4),
                CurrentPeriodStart = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                CurrentPeriodEnd = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                CreatedAt = reader.GetDateTime(7),
                UpdatedAt = reader.GetDateTime(8)
            };
        }
        return null;
    }

    public async Task UpdateSubscriptionStatus(string userId, string status, string? stripeSubscriptionId, DateTime? periodStart, DateTime? periodEnd)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                UPDATE subscriptions
                SET status = $status, stripe_subscription_id = $stripe_subscription_id,
                    current_period_start = $current_period_start, current_period_end = $current_period_end,
                    updated_at = current_timestamp
                WHERE user_id = $user_id";
            cmd.Parameters.Add(new DuckDBParameter("status", status));
            cmd.Parameters.Add(new DuckDBParameter("stripe_subscription_id", (object?)stripeSubscriptionId ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("current_period_start", (object?)periodStart ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("current_period_end", (object?)periodEnd ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("user_id", userId));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    // Word pack operations

    public async Task CreateWordPack(WordPack pack)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO word_packs (id, name, description, icon_url, is_premium, is_default, created_at)
                VALUES ($id, $name, $description, $icon_url, $is_premium, $is_default, $created_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", pack.Id));
            cmd.Parameters.Add(new DuckDBParameter("name", pack.Name));
            cmd.Parameters.Add(new DuckDBParameter("description", pack.Description));
            cmd.Parameters.Add(new DuckDBParameter("icon_url", (object?)pack.IconUrl ?? DBNull.Value));
            cmd.Parameters.Add(new DuckDBParameter("is_premium", pack.IsPremium));
            cmd.Parameters.Add(new DuckDBParameter("is_default", pack.IsDefault));
            cmd.Parameters.Add(new DuckDBParameter("created_at", pack.CreatedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task CreateWord(Word word)
    {
        await _writeLock.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT INTO words (id, pack_id, text, created_at) VALUES ($id, $pack_id, $text, $created_at)";
            cmd.Parameters.Add(new DuckDBParameter("id", word.Id));
            cmd.Parameters.Add(new DuckDBParameter("pack_id", word.PackId));
            cmd.Parameters.Add(new DuckDBParameter("text", word.Text));
            cmd.Parameters.Add(new DuckDBParameter("created_at", word.CreatedAt));
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<List<WordPack>> GetAllWordPacks()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, name, description, icon_url, is_premium, is_default, created_at FROM word_packs ORDER BY is_default DESC, name ASC";
        using var reader = await cmd.ExecuteReaderAsync();
        var packs = new List<WordPack>();
        while (await reader.ReadAsync())
        {
            packs.Add(new WordPack
            {
                Id = reader.GetString(0),
                Name = reader.GetString(1),
                Description = reader.GetString(2),
                IconUrl = reader.IsDBNull(3) ? null : reader.GetString(3),
                IsPremium = reader.GetBoolean(4),
                IsDefault = reader.GetBoolean(5),
                CreatedAt = reader.GetDateTime(6)
            });
        }
        return packs;
    }

    public async Task<WordPack?> GetWordPackById(string id)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT id, name, description, icon_url, is_premium, is_default, created_at FROM word_packs WHERE id = $id";
        cmd.Parameters.Add(new DuckDBParameter("id", id));
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new WordPack
            {
                Id = reader.GetString(0),
                Name = reader.GetString(1),
                Description = reader.GetString(2),
                IconUrl = reader.IsDBNull(3) ? null : reader.GetString(3),
                IsPremium = reader.GetBoolean(4),
                IsDefault = reader.GetBoolean(5),
                CreatedAt = reader.GetDateTime(6)
            };
        }
        return null;
    }

    public async Task<int> GetWordCountForPack(string packId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM words WHERE pack_id = $pack_id";
        cmd.Parameters.Add(new DuckDBParameter("pack_id", packId));
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task<string?> GetRandomWordFromPack(string packId)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT text FROM words WHERE pack_id = $pack_id ORDER BY RANDOM() LIMIT 1";
        cmd.Parameters.Add(new DuckDBParameter("pack_id", packId));
        var result = await cmd.ExecuteScalarAsync();
        return result?.ToString();
    }

    public async Task<bool> HasWordPacks()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM word_packs";
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result) > 0;
    }

    public void Dispose()
    {
        _batchFlushTimer?.Dispose();
        FlushLastSeenBatch().GetAwaiter().GetResult(); // Final flush on dispose
        _cache.Dispose();
        _writeLock.Dispose();
        _connection.Dispose();
    }
}
