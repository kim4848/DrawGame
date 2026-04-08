using Hearsay.Api.Models;
using Hearsay.Api.Services;

namespace Hearsay.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/register", async (RegisterRequest req, DuckDbService db, AuthService auth) =>
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            {
                return Results.BadRequest(new { error = "Email og adgangskode er påkrævet" });
            }

            if (!IsValidEmail(req.Email))
            {
                return Results.BadRequest(new { error = "Ugyldig email-adresse" });
            }

            // Validate password complexity
            var passwordErrors = ValidatePasswordComplexity(req.Password);
            if (passwordErrors.Count > 0)
            {
                return Results.BadRequest(new { error = string.Join(", ", passwordErrors) });
            }

            // Check if user already exists
            var existingUser = await db.GetUserByEmail(req.Email);
            if (existingUser != null)
            {
                return Results.BadRequest(new { error = "En bruger med denne email findes allerede" });
            }

            // Create user
            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = req.Email,
                PasswordHash = auth.HashPassword(req.Password),
                DisplayName = req.DisplayName,
                CreatedAt = DateTime.UtcNow
            };

            await db.CreateUser(user);

            // Generate JWT
            var token = auth.GenerateJwtToken(user.Id, user.Email);

            return Results.Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    displayName = user.DisplayName
                }
            });
        });

        app.MapPost("/api/auth/login", async (LoginRequest req, DuckDbService db, AuthService auth) =>
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            {
                return Results.BadRequest(new { error = "Email og adgangskode er påkrævet" });
            }

            // Find user
            var user = await db.GetUserByEmail(req.Email);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            // Verify password
            if (!auth.VerifyPassword(req.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            // Update last login
            await db.UpdateLastLogin(user.Id);

            // Generate JWT
            var token = auth.GenerateJwtToken(user.Id, user.Email);

            return Results.Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    displayName = user.DisplayName
                }
            });
        });

        app.MapGet("/api/auth/me", async (HttpContext context, DuckDbService db) =>
        {
            // Get user ID from claims
            var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Results.Unauthorized();
            }

            // Get user
            var user = await db.GetUserById(userId);
            if (user == null)
            {
                return Results.NotFound(new { error = "Bruger ikke fundet" });
            }

            return Results.Ok(new
            {
                id = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                createdAt = user.CreatedAt,
                lastLoginAt = user.LastLoginAt
            });
        }).RequireAuthorization();
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private static List<string> ValidatePasswordComplexity(string password)
    {
        var errors = new List<string>();

        if (password.Length < 8)
        {
            errors.Add("Adgangskoden skal være mindst 8 tegn");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(password, "[A-Z]"))
        {
            errors.Add("Adgangskoden skal indeholde mindst ét stort bogstav");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(password, "[a-z]"))
        {
            errors.Add("Adgangskoden skal indeholde mindst ét lille bogstav");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(password, "[0-9]"))
        {
            errors.Add("Adgangskoden skal indeholde mindst ét tal");
        }

        return errors;
    }
}

public record RegisterRequest(string Email, string Password, string? DisplayName);
public record LoginRequest(string Email, string Password);
