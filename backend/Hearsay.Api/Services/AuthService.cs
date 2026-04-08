using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Hearsay.Api.Services;

public class AuthService
{
    private readonly string _jwtSecret;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;
    private readonly int _jwtExpirationHours;

    public AuthService(IConfiguration config)
    {
        _jwtSecret = config["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET not configured");
        _jwtIssuer = config["JWT_ISSUER"] ?? "hearsay-api";
        _jwtAudience = config["JWT_AUDIENCE"] ?? "hearsay-app";
        _jwtExpirationHours = int.TryParse(config["JWT_EXPIRATION_HOURS"], out var hours) ? hours : 168; // 7 days default
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    public string GenerateJwtToken(string userId, string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Email, email)
            }),
            Expires = DateTime.UtcNow.AddHours(_jwtExpirationHours),
            Issuer = _jwtIssuer,
            Audience = _jwtAudience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public SymmetricSecurityKey GetSigningKey()
    {
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
    }

    public string GetIssuer() => _jwtIssuer;
    public string GetAudience() => _jwtAudience;
}
