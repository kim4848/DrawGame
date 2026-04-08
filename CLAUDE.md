# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Hearsay" (Danish: "Rygtet Går") — a digital multiplayer Telephone Pictionary game. Players alternate between drawing a word and guessing what a drawing shows. Chains are revealed at the end.

**Language rule:** All UI text, error messages, buttons, instructions, and tooltips must be in **Danish**. Codebase (variable names, comments, API fields) is in **English**.

## Architecture

Two Docker containers behind Cosmos Server (reverse proxy + SSL):

- **Backend** — .NET 8 Minimal API on port 5000, using DuckDB for state and Azure Blob Storage for drawing PNGs
- **Frontend** — React 18 + TypeScript + Vite, served via nginx on port 3000

No WebSockets — frontend polls `GET /api/rooms/{id}/poll?playerId={id}` every 2 seconds.

DuckDB is single-writer; all writes serialized via `SemaphoreSlim(1,1)`.

## Build & Run

```bash
# Full stack
docker compose up --build

# Backend only (from backend/)
dotnet build
dotnet run

# Frontend only (from frontend/)
npm ci
npm run dev        # dev server
npm run build      # production build
```

## Key Design Decisions

- **Round assignment:** In round R, player index `i` works on chain owned by player `(i + R) % N`. No player sees their own chain until reveal.
- **State machine:** LOBBY → ACTIVE → REVEAL → DONE. Round advancement happens synchronously inside `POST /api/rooms/{id}/submit`.
- **Drawing upload is two-step:** `POST /api/drawings/upload` (stores PNG to Azure Blob) then `POST /api/rooms/{id}/submit` (records the blob URL).
- **Timers:** Hardcoded 90s for drawing, 30s for guessing (v1).
- **Player identity:** Ephemeral per session, stored in `localStorage` (`myPlayerId`, `myRoomId`, `myRoomCode`).
- **Authentication:** JWT-based user accounts (optional). Players can be anonymous OR authenticated. `players.user_id` links to `users.id` when authenticated.

## API Endpoints

```
# Authentication (optional)
POST   /api/auth/register          — Register new user (email, password, displayName)
POST   /api/auth/login             — Login (email, password) → JWT token
GET    /api/auth/me                — Get current user (requires JWT)

# Payments (requires JWT)
POST   /api/payments/create-checkout — Create Stripe checkout session (returns URL)
GET    /api/payments/subscription    — Get user subscription status
POST   /api/payments/portal          — Create customer portal session (manage subscription)
POST   /api/payments/webhook         — Stripe webhook handler (public, signature verified)

# Game
POST   /api/rooms                  — Create room
POST   /api/rooms/{code}/join      — Join room
GET    /api/rooms/{code}           — Room state
POST   /api/rooms/{id}/start       — Host starts game
GET    /api/rooms/{id}/poll        — Poll (updates last_seen_at)
POST   /api/rooms/{id}/submit      — Submit entry (advances round if all submitted)
POST   /api/drawings/upload        — Upload drawing PNG to Azure Blob
GET    /api/rooms/{id}/reveal      — Full chain data for reveal
GET    /health                     — Health check
```

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_BLOB_CONNECTION_STRING` | Azure Storage connection string |
| `AZURE_BLOB_CONTAINER` | Blob container name (`hearsay`) |
| `DB_PATH` | DuckDB file path (`/data/hearsay.duckdb`) |
| `ASPNETCORE_URLS` | Backend listen URL (`http://+:5000`) |
| `VITE_API_BASE_URL` | Frontend API base URL |
| `JWT_SECRET` | Secret key for JWT signing (required for auth) |
| `JWT_ISSUER` | JWT issuer (default: `hearsay-api`) |
| `JWT_AUDIENCE` | JWT audience (default: `hearsay-app`) |
| `JWT_EXPIRATION_HOURS` | Token expiration in hours (default: `168` = 7 days) |
| `STRIPE_SECRET_KEY` | Stripe API secret key (required for payments) |
| `STRIPE_PRICE_ID` | Stripe Price ID for 29 DKK/month subscription |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `VITE_PUBLIC_SITE_URL` | Public site URL for share links (default: `window.location.origin`) |

## Specification

The full game spec is in `rygtet-gar-spec.md` — consult it for data model schemas, UI text strings (Danish), detailed round logic, and Docker configuration.
