using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Hearsay.Api.Services;

public class BlobStorageService
{
    private readonly BlobContainerClient? _containerClient;
    private readonly string _localStoragePath;
    private readonly bool _useLocalStorage;

    public BlobStorageService(IConfiguration config)
    {
        var connectionString = config["AZURE_BLOB_CONNECTION_STRING"];
        var containerName = config["AZURE_BLOB_CONTAINER"] ?? "hearsay";

        if (!string.IsNullOrEmpty(connectionString) && !connectionString.Contains("CHANGEME"))
        {
            var serviceClient = new BlobServiceClient(connectionString);
            _containerClient = serviceClient.GetBlobContainerClient(containerName);
            _containerClient.CreateIfNotExists(PublicAccessType.None);
            _useLocalStorage = false;
            _localStoragePath = "";
        }
        else
        {
            // Fall back to local file storage for development
            _localStoragePath = config["LOCAL_BLOB_PATH"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
            Directory.CreateDirectory(_localStoragePath);
            _useLocalStorage = true;
        }
    }

    public async Task<string> UploadDrawing(string roomId, string chainId, int round, Stream imageStream)
    {
        var blobPath = $"{roomId}/{chainId}/round-{round}.png";

        if (_useLocalStorage)
        {
            var fullPath = Path.Combine(_localStoragePath, blobPath);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
            using var fs = File.Create(fullPath);
            await imageStream.CopyToAsync(fs);
            return $"/api/drawings/{blobPath}";
        }

        var blobClient = _containerClient!.GetBlobClient(blobPath);
        await blobClient.UploadAsync(imageStream, new BlobHttpHeaders { ContentType = "image/png" });
        return blobClient.Uri.ToString();
    }

    public string GetSasUrl(string blobUrl, TimeSpan expiry)
    {
        if (_useLocalStorage)
            return blobUrl; // Local URLs are already accessible

        var blobUri = new Uri(blobUrl);
        var blobClient = _containerClient!.GetBlobClient(blobUri.AbsolutePath.TrimStart('/').Replace(_containerClient.Name + "/", ""));

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _containerClient.Name,
            BlobName = blobClient.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(expiry)
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blobClient.GenerateSasUri(sasBuilder).ToString();
    }

    public string? GetLocalFilePath(string blobPath)
    {
        if (!_useLocalStorage) return null;
        var fullPath = Path.GetFullPath(Path.Combine(_localStoragePath, blobPath));
        if (!fullPath.StartsWith(Path.GetFullPath(_localStoragePath) + Path.DirectorySeparatorChar))
            return null;
        return File.Exists(fullPath) ? fullPath : null;
    }
}
