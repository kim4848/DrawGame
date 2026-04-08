namespace Hearsay.Api.Models;

public class WordPack
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string? IconUrl { get; set; }
    public bool IsPremium { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Word
{
    public string Id { get; set; } = "";
    public string PackId { get; set; } = "";
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
