using Hearsay.Api.Models;

namespace Hearsay.Api.Services;

public class WordPackService
{
    private readonly DuckDbService _db;

    public WordPackService(DuckDbService db)
    {
        _db = db;
    }

    public async Task<List<WordPackDto>> GetAvailablePacksForUser(string? userId)
    {
        var allPacks = await _db.GetAllWordPacks();

        // Check user premium status
        bool isPremium = false;
        if (!string.IsNullOrEmpty(userId))
        {
            var subscription = await _db.GetSubscriptionByUserId(userId);
            isPremium = subscription?.Status == "active";
        }

        var packDtos = new List<WordPackDto>();
        foreach (var pack in allPacks)
        {
            // Filter premium packs for non-premium users
            bool isLocked = pack.IsPremium && !isPremium;
            int wordCount = await _db.GetWordCountForPack(pack.Id);

            packDtos.Add(new WordPackDto(
                pack.Id,
                pack.Name,
                pack.Description,
                pack.IconUrl,
                pack.IsPremium,
                isLocked,
                pack.IsDefault,
                wordCount
            ));
        }

        return packDtos;
    }

    public async Task<WordPackDto?> GetPackById(string packId, string? userId)
    {
        var pack = await _db.GetWordPackById(packId);
        if (pack == null) return null;

        // Check user premium status
        bool isPremium = false;
        if (!string.IsNullOrEmpty(userId))
        {
            var subscription = await _db.GetSubscriptionByUserId(userId);
            isPremium = subscription?.Status == "active";
        }

        bool isLocked = pack.IsPremium && !isPremium;
        int wordCount = await _db.GetWordCountForPack(pack.Id);

        return new WordPackDto(
            pack.Id,
            pack.Name,
            pack.Description,
            pack.IconUrl,
            pack.IsPremium,
            isLocked,
            pack.IsDefault,
            wordCount
        );
    }

    public async Task<string?> GetRandomWord(string packId, string? userId)
    {
        var pack = await _db.GetWordPackById(packId);
        if (pack == null) return null;

        // Check premium access
        if (pack.IsPremium)
        {
            if (string.IsNullOrEmpty(userId))
                return null; // Premium pack requires authentication

            var subscription = await _db.GetSubscriptionByUserId(userId);
            if (subscription?.Status != "active")
                return null; // Premium pack requires active subscription
        }

        return await _db.GetRandomWordFromPack(packId);
    }

    public async Task SeedDefaultPacks()
    {
        // Check if packs already exist
        if (await _db.HasWordPacks())
            return;

        // Default free pack: "Dagligdags" (Everyday)
        var defaultPack = new WordPack
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = "Dagligdags",
            Description = "Almindelige ting fra hverdagen",
            IconUrl = null,
            IsPremium = false,
            IsDefault = true,
            CreatedAt = DateTime.UtcNow
        };
        await _db.CreateWordPack(defaultPack);

        var defaultWords = new[]
        {
            "Cykel", "Kaffekop", "Regn", "Solskin", "Bog", "Sko", "Blomst", "Hund", "Kat", "Bil",
            "Hus", "Træ", "Stol", "Bord", "Telefon", "Computer", "Smil", "Musik", "Dans", "Mad",
            "Vand", "Brød", "Ost", "Fisk", "Fugl", "Strand", "Skov", "Fjeld", "Sne", "Is",
            "Sommer", "Vinter", "Forår", "Efterår", "Øl", "Vin", "Kaffe", "Te", "Søvn", "Drøm",
            "Familie", "Ven", "Kærlighed", "Glæde", "Latter", "Fest", "Gave", "Fødselsdag", "Jul", "Nytår"
        };

        foreach (var wordText in defaultWords)
        {
            await _db.CreateWord(new Word
            {
                Id = Guid.NewGuid().ToString("N"),
                PackId = defaultPack.Id,
                Text = wordText,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Premium pack: "Eventyr" (Fairy Tales)
        var premiumPack1 = new WordPack
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = "Eventyr",
            Description = "H.C. Andersen og klassiske eventyr",
            IconUrl = null,
            IsPremium = true,
            IsDefault = false,
            CreatedAt = DateTime.UtcNow
        };
        await _db.CreateWordPack(premiumPack1);

        var fairyTaleWords = new[]
        {
            "Prinsesse", "Prins", "Drage", "Slot", "Troldmand", "Heks", "Trold", "Alfe", "Krone", "Sværd",
            "Ridder", "Enhjørning", "Trylleskov", "Glassko", "Æble", "Spejl", "Tårn", "Frø", "Svane", "Sølv",
            "Guld", "Diamant", "Eventyr", "Magi", "Ønsker", "Fortryllelse", "Kys", "Dans", "Slot", "Stjerne",
            "Måne", "Sol", "Regnbue", "Sky", "Vinge", "Fe", "Nissehue", "Kæreste", "Kys", "Blomstereng"
        };

        foreach (var wordText in fairyTaleWords)
        {
            await _db.CreateWord(new Word
            {
                Id = Guid.NewGuid().ToString("N"),
                PackId = premiumPack1.Id,
                Text = wordText,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Premium pack: "Danmark" (Denmark)
        var premiumPack2 = new WordPack
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = "Danmark",
            Description = "Danske steder, mad og kultur",
            IconUrl = null,
            IsPremium = true,
            IsDefault = false,
            CreatedAt = DateTime.UtcNow
        };
        await _db.CreateWordPack(premiumPack2);

        var danishWords = new[]
        {
            "København", "Aarhus", "Odense", "Aalborg", "Tivoli", "Nyhavn", "Rundetårn", "Lille Havfrue", "Smørrebrød", "Frikadeller",
            "Rødgrød", "Flæskesteg", "Æbleskiver", "Rugbrød", "Remoulade", "Pølsevogn", "Hygge", "Dannebrog", "Viking", "Lego",
            "H.C. Andersen", "Karen Blixen", "Niels Bohr", "Øresundsbro", "Storebælt", "Bornholm", "Skagen", "Møns Klint", "Kronborg", "Frederiksborg",
            "Christiania", "Strøget", "Bakken", "Legoland", "Roskilde", "Grønland", "Færøerne", "Carlsberg", "Tuborg", "Faxe Kondi"
        };

        foreach (var wordText in danishWords)
        {
            await _db.CreateWord(new Word
            {
                Id = Guid.NewGuid().ToString("N"),
                PackId = premiumPack2.Id,
                Text = wordText,
                CreatedAt = DateTime.UtcNow
            });
        }
    }
}

public record WordPackDto(
    string Id,
    string Name,
    string Description,
    string? IconUrl,
    bool IsPremium,
    bool IsLocked,
    bool IsDefault,
    int WordCount
);
