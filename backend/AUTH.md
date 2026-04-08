# Authentication System

## Overview

The Hearsay backend now supports optional JWT-based user authentication. Players can choose to play:
- **Anonymously** (existing behavior) - no authentication required
- **As authenticated users** - register/login for persistent identity, stats tracking, and premium features

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id            VARCHAR PRIMARY KEY,
    email         VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    display_name  VARCHAR,
    created_at    TIMESTAMP DEFAULT current_timestamp,
    last_login_at TIMESTAMP
);
```

### Players Table (Updated)

The `players` table now includes an optional `user_id` column that links to the `users` table:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id VARCHAR;
```

## API Endpoints

### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "minst8tegn",
  "displayName": "Brugernavn"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Brugernavn"
  }
}
```

**Errors:**
- `400 Bad Request` - "Email og adgangskode er påkrævet"
- `400 Bad Request` - "Ugyldig email-adresse"
- `400 Bad Request` - "Adgangskode skal være mindst 8 tegn"
- `400 Bad Request` - "En bruger med denne email findes allerede"

### POST /api/auth/login

Login with existing credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "minst8tegn"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Brugernavn"
  }
}
```

**Errors:**
- `400 Bad Request` - "Email og adgangskode er påkrævet"
- `401 Unauthorized` - Invalid credentials

### GET /api/auth/me

Get current user information (requires JWT authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Brugernavn",
  "createdAt": "2026-04-06T12:00:00Z",
  "lastLoginAt": "2026-04-06T13:30:00Z"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - "Bruger ikke fundet"

## Environment Variables

Authentication requires the following environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing (use a strong random string) |
| `JWT_ISSUER` | No | `hearsay-api` | JWT issuer identifier |
| `JWT_AUDIENCE` | No | `hearsay-app` | JWT audience identifier |
| `JWT_EXPIRATION_HOURS` | No | `168` | Token expiration time (7 days default) |

**Important:** If `JWT_SECRET` is not set, authentication endpoints will be available but JWT validation will fail. For development, generate a secret with:

```bash
openssl rand -base64 32
```

## Security Features

- **Password Hashing:** Uses BCrypt with automatic salting
- **JWT Tokens:** HS256 signature algorithm
- **Email Validation:** Basic format validation
- **Password Requirements:** Minimum 8 characters
- **Case-Insensitive Email:** Emails stored in lowercase

## Integration with Game Flow

### Anonymous Play (Existing)
No changes required. Players can continue joining rooms without authentication.

### Authenticated Play (New)
1. User registers or logs in → receives JWT token
2. Frontend stores token (localStorage or httpOnly cookie)
3. When joining a room, optionally include `userId` in player data
4. Backend links player to user account via `players.user_id`

This enables:
- Tracking player stats across sessions
- Premium features (custom word packs, themes)
- Payment integration (linking purchases to accounts)

## Testing

### Manual Testing with curl

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","displayName":"TestUser"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

**Get Current User:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token-from-login>"
```

## Next Steps

- [ ] Frontend UI for registration/login
- [ ] Link authenticated users when joining rooms
- [ ] User profile page
- [ ] Stats tracking per user
- [ ] Premium features gating
