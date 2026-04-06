using Hearsay.Api.Models;
using Hearsay.Api.Services;

namespace Hearsay.Api.Endpoints;

public static class DrawingsEndpoints
{
    public static void MapDrawingEndpoints(this WebApplication app)
    {
        app.MapPost("/api/drawings/upload", async (HttpRequest request, BlobStorageService blob) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest(new { error = "Expected multipart/form-data" });

            var form = await request.ReadFormAsync();
            var roomId = form["roomId"].ToString();
            var chainId = form["chainId"].ToString();
            var roundStr = form["round"].ToString();
            var file = form.Files.GetFile("file");

            if (string.IsNullOrEmpty(roomId) || string.IsNullOrEmpty(chainId) || file == null || !int.TryParse(roundStr, out int round))
                return Results.BadRequest(new { error = "Missing required fields" });

            using var stream = file.OpenReadStream();
            var blobUrl = await blob.UploadDrawing(roomId, chainId, round, stream);
            return Results.Ok(new UploadResponse(blobUrl));
        });

        app.MapGet("/api/drawings/gallery", async (DuckDbService db, BlobStorageService blob, int? count) =>
        {
            var drawings = await db.GetRandomDrawings(count ?? 8);
            var result = drawings.Select(d => new
            {
                imageUrl = blob.GetSasUrl(d.Content, TimeSpan.FromHours(1)),
                word = d.Word
            });
            return Results.Ok(result);
        });

        // Serve local drawings in dev mode
        app.MapGet("/api/drawings/{**path}", (string path, BlobStorageService blob) =>
        {
            var filePath = blob.GetLocalFilePath(path);
            if (filePath == null)
                return Results.NotFound();

            return Results.File(filePath, "image/png");
        });
    }
}
