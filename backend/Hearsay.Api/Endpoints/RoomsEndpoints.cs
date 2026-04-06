using Hearsay.Api.Models;
using Hearsay.Api.Services;

namespace Hearsay.Api.Endpoints;

public static class RoomsEndpoints
{
    public static void MapRoomEndpoints(this WebApplication app)
    {
        app.MapPost("/api/rooms", async (CreateRoomRequest req, GameService game) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Name is required" });

            var (room, player) = await game.CreateRoom(req.Name.Trim());
            return Results.Ok(new CreateRoomResponse(room.Id, room.Code, player.Id));
        });

        app.MapPost("/api/rooms/{code}/join", async (string code, JoinRoomRequest req, GameService game) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Name is required" });

            var result = await game.JoinRoom(code.ToUpperInvariant(), req.Name.Trim());
            if (result == null)
                return Results.NotFound(new { error = "Rummet blev ikke fundet eller spillet er allerede i gang." });

            return Results.Ok(new JoinRoomResponse(result.Value.Room.Id, result.Value.Player.Id));
        });

        app.MapPost("/api/rooms/{code}/rejoin", async (string code, RejoinRequest req, GameService game) =>
        {
            var result = await game.RejoinRoom(code.ToUpperInvariant(), req.PlayerId);
            if (result == null)
                return Results.NotFound(new { error = "Kunne ikke genoprette forbindelsen." });

            return Results.Ok(new RejoinResponse(result.Value.Room.Id, result.Value.Room.Status));
        });

        app.MapGet("/api/rooms/{code}", async (string code, GameService game) =>
        {
            var state = await game.GetRoomState(code.ToUpperInvariant());
            if (state == null)
                return Results.NotFound(new { error = "Rummet blev ikke fundet." });

            return Results.Ok(state);
        });

        app.MapPost("/api/rooms/{id}/start", async (string id, StartGameRequest req, GameService game) =>
        {
            var success = await game.StartGame(id, req.PlayerId, req.DrawTimer, req.GuessTimer);
            if (!success)
                return Results.BadRequest(new { error = "Kunne ikke starte spillet." });

            return Results.Ok(new { ok = true });
        });

        app.MapGet("/api/rooms/{id}/poll", async (string id, string playerId, GameService game) =>
        {
            var data = await game.GetPollData(id, playerId);
            if (data == null)
                return Results.NotFound(new { error = "Room not found" });

            return Results.Ok(data);
        });

        app.MapPost("/api/rooms/{id}/submit", async (string id, SubmitRequest req, GameService game) =>
        {
            var success = await game.Submit(id, req.PlayerId, req.ChainId, req.Round, req.Type, req.Content);
            if (!success)
                return Results.BadRequest(new { error = "Kunne ikke indsende." });

            return Results.Ok(new { ok = true });
        });

        app.MapGet("/api/rooms/{id}/reveal", async (string id, GameService game) =>
        {
            var data = await game.GetRevealData(id);
            if (data == null)
                return Results.NotFound(new { error = "Room not found" });

            return Results.Ok(data);
        });

        app.MapPost("/api/rooms/{id}/play-again", async (string id, PlayAgainRequest req, GameService game) =>
        {
            var result = await game.PlayAgain(id, req.PlayerId);
            if (result == null)
                return Results.BadRequest(new { error = "Kunne ikke starte nyt spil." });

            return Results.Ok(new PlayAgainResponse(result.Value.NewRoom.Id, result.Value.NewRoom.Code, result.Value.NewHostPlayer.Id));
        });

        app.MapPost("/api/rooms/{id}/done", async (string id, StartGameRequest req, DuckDbService db) =>
        {
            var room = await db.GetRoomById(id);
            if (room == null || room.HostId != req.PlayerId)
                return Results.BadRequest(new { error = "Unauthorized" });

            await db.UpdateRoomStatus(id, "DONE");
            return Results.Ok(new { ok = true });
        });
    }
}
