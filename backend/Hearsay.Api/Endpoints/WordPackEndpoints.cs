using System.Security.Claims;
using Hearsay.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hearsay.Api.Endpoints;

public static class WordPackEndpoints
{
    public static void MapWordPackEndpoints(this WebApplication app)
    {
        app.MapGet("/api/word-packs", async (
            [FromServices] WordPackService wordPackService,
            ClaimsPrincipal? user) =>
        {
            var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var packs = await wordPackService.GetAvailablePacksForUser(userId);
            return Results.Ok(packs);
        });

        app.MapGet("/api/word-packs/{id}", async (
            string id,
            [FromServices] WordPackService wordPackService,
            ClaimsPrincipal? user) =>
        {
            var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var pack = await wordPackService.GetPackById(id, userId);
            if (pack == null)
                return Results.NotFound(new { error = "Ordpakke ikke fundet" });

            return Results.Ok(pack);
        });

        app.MapGet("/api/word-packs/{id}/random-word", async (
            string id,
            [FromServices] WordPackService wordPackService,
            ClaimsPrincipal? user) =>
        {
            var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var word = await wordPackService.GetRandomWord(id, userId);

            if (word == null)
                return Results.BadRequest(new { error = "Kan ikke hente ord fra denne pakke. Kræver premium abonnement." });

            return Results.Ok(new { word });
        });
    }
}
