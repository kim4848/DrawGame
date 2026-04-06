# Hearsay – Digital Multiplayer Game: Technical Specification

## 1. Concept

A digital version of the board game "Rygtet Går" (Telephone Pictionary / Gartic Phone).  
Players alternate between **drawing** a word and **guessing** what a drawing shows. The chain of drawings and guesses is revealed at the end, often with hilarious results.

> **Sprog:** Al tekst i UI, fejlbeskeder, knapper, instruktioner og tooltips skal være på **dansk**. Kodebasen (variabelnavne, kommentarer, API-felter) er på engelsk.

---

## 2. Game Flow

```
[Host creates room] → [Players join via room code]
→ [Each player types a SECRET WORD]
→ Rounds alternate:
     ODD rounds  → Draw the previous guess (canvas)
     EVEN rounds → Guess what the drawing shows (text)
→ [Reveal phase: each chain shown step by step]
→ [Done]
```

Number of rounds = number of players (each chain passes through everyone exactly once).

---

## 3. Architecture

### 3.1 Services (Docker)

| Container      | Technology              | Port |
|---------------|-------------------------|------|
| `backend`     | .NET 8 Minimal API           | 5000 |
| `frontend`    | nginx (React/Vite build) | 3000 |

> **Cosmos Server** handles reverse proxy, SSL termination, and routing to both containers.

### 3.2 Storage

| Storage       | Purpose                                          |
|--------------|--------------------------------------------------|
| DuckDB        | All game state (rooms, players, chains, entries) |
| Azure Blob Storage | Drawing images (PNG canvases per round)   |

DuckDB file path: `/data/hearsay.duckdb` (mounted Docker volume).  
DuckDB is single-writer; all writes go through the backend which serializes via a `SemaphoreSlim(1)` or similar lock.

---

## 4. Data Model (DuckDB)

```sql
CREATE TABLE rooms (
    id          VARCHAR PRIMARY KEY,
    code        VARCHAR(6) UNIQUE NOT NULL,  -- e.g. "XKPL42"
    host_id     VARCHAR NOT NULL,
    status      VARCHAR NOT NULL,            -- LOBBY | ACTIVE | REVEAL | DONE
    num_players INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE players (
    id            VARCHAR PRIMARY KEY,
    room_id       VARCHAR NOT NULL REFERENCES rooms(id),
    name          VARCHAR NOT NULL,
    last_seen_at  TIMESTAMP DEFAULT now(),  -- updated on each poll; detect dropouts
    joined_at     TIMESTAMP DEFAULT now()
);

CREATE TABLE chains (
    id                VARCHAR PRIMARY KEY,
    room_id           VARCHAR NOT NULL REFERENCES rooms(id),
    origin_player_id  VARCHAR NOT NULL,      -- who wrote the starting word
    current_round     INTEGER DEFAULT 0      -- which round is pending for this chain
);

CREATE TABLE chain_entries (
    id           VARCHAR PRIMARY KEY,
    chain_id     VARCHAR NOT NULL REFERENCES chains(id),
    round_number INTEGER NOT NULL,
    player_id    VARCHAR NOT NULL,
    type         VARCHAR NOT NULL,           -- WORD | DRAW | GUESS
    content      VARCHAR,                    -- text content or Azure Blob URL
    submitted_at TIMESTAMP DEFAULT now(),
    UNIQUE(chain_id, round_number)
);
```

---

## 5. Round Assignment Logic

- Each player **owns** one chain (created from their starting word).
- In **round R**, player at index `i` works on the chain owned by player at index `(i + R) % N`.
- This guarantees no player works on their own chain until the reveal.
- Round 0 = secret word entry (type: `WORD`).
- Round 1 = draw round 0's word (type: `DRAW`).
- Round 2 = guess round 1's drawing (type: `GUESS`).
- Alternates until `R = N - 1`.

---

## 6. Backend API

### 6.1 REST Endpoints

```
POST   /api/rooms              → Create room, returns { roomId, roomCode, playerId }
POST   /api/rooms/{code}/join  → Join room, returns { roomId, playerId }
GET    /api/rooms/{code}       → Get room state (players, status)
POST   /api/rooms/{id}/start   → Host starts game (creates chains, begins round 0)
POST   /api/drawings/upload    → Upload drawing PNG → stores to Azure Blob, returns { blobUrl }
GET    /api/rooms/{id}/reveal  → Returns full chain data for reveal phase
```

### 6.2 Polling Endpoint

```
GET /api/rooms/{id}/poll?playerId={playerId}
```

Opdaterer `players.last_seen_at` og returnerer fuld room state. Frontend kalder dette hvert **2. sekund**.

**Response:**

```json
{
  "status": "ACTIVE",
  "currentRound": 2,
  "roundType": "GUESS",
  "players": [
    { "id": "p1", "name": "Lars", "hasSubmitted": true },
    { "id": "p2", "name": "Mette", "hasSubmitted": false }
  ],
  "assignment": {
    "chainId": "c3",
    "content": "https://blob.../round-1.png"
  },
  "allSubmitted": false
}
```

- `assignment` er **player-specifik** — backend beregner hvilken chain der tilhører denne spiller i denne runde baseret på `playerId` + round assignment logic.
- `assignment.content` er tekst (WORD/GUESS) eller SAS-URL til blob (DRAW).
- Når `allSubmitted = true` og timer udløber, avancerer backend automatisk til næste runde ved næste `POST /api/rooms/{id}/submit`.

### 6.3 Submit Endpoint

```
POST /api/rooms/{id}/submit
Body: { playerId, chainId, round, type, content }
```

- Gemmer entry i `chain_entries`.
- Tjekker om alle spillere har indsendt for denne runde.
- Hvis ja: avancerer `current_round` og opdaterer room state.
- Hvis alle runder er færdige: sætter `status = REVEAL`.

---

## 7. Drawing Upload Flow

1. Player finishes drawing on canvas → frontend eksporterer som PNG (`canvas.toBlob()`).
2. Frontend `POST /api/drawings/upload` med `multipart/form-data` (felter: `roomId`, `chainId`, `round`, image file).
3. Backend uploader til Azure Blob Storage:
   - Container: `hearsay`
   - Blob path: `{roomId}/{chainId}/round-{round}.png`
   - Access: private; backend genererer SAS URLs ved reveal.
4. Backend gemmer blob URL i `chain_entries.content` og markerer entry som submitted.
5. Backend returnerer `{ ok: true }` — frontend kalder dernæst `/api/rooms/{id}/submit` med blob URL som content.

### Azure Blob Config (environment variable)

```
AZURE_BLOB_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_BLOB_CONTAINER=hearsay
```

---

## 8. Backend Implementation Notes

- **Framework:** .NET 8 Minimal API
- **DuckDB:** `DuckDB.NET.Data` NuGet package
- **Azure Blob:** `Azure.Storage.Blobs` NuGet package
- **DuckDB concurrency:** Single `SemaphoreSlim(1,1)` wrapping alle write-operationer
- **CORS:** Allow frontend origin
- **Health check:** `GET /health` returnerer 200
- **Dropout detection:** Spillere der ikke har pollet i >30 sekunder markeres som inaktive i lobby (men ikke under aktivt spil)

### Game State Machine (per room)

```
LOBBY → ACTIVE (POST /api/rooms/{id}/start)
ACTIVE → REVEAL (automatisk når alle runder er færdige)
REVEAL → DONE  (POST /api/rooms/{id}/done fra host)
```

Rundeadvancering sker synkront inde i `POST /api/rooms/{id}/submit`:
1. Gem entry i `chain_entries`.
2. Tæl indsendte entries for denne runde.
3. Hvis alle spillere har indsendt: inkrementer `current_round` på alle chains.
4. Hvis `current_round == num_players`: sæt `status = REVEAL`.
5. Næste poll fra enhver spiller returnerer straks den nye state.

---

## 9. Frontend

- **Stack:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Polling:** Native `setInterval` + `fetch` — ingen ekstra biblioteker
- **Canvas:** Native HTML5 Canvas API (ingen lib nødvendig)

### Pages / Views

| Route       | View                                                                 |
|------------|----------------------------------------------------------------------|
| `/`        | Home — Opret rum eller deltag med kode                               |
| `/lobby`   | Lobby — Spillerliste, host ser Start-knap                            |
| `/play`    | Game — Skifter mellem DrawCanvas og GuessInput                       |
| `/reveal`  | Reveal — Animeret trin-for-trin visning af hver kæde                |

### DrawCanvas Component

- Fuld-bredde canvas med touch + mouse support
- Værktøjer: pen (variabel størrelse), viskelæder, farvevælger, ryd
- Ved indsend: `canvas.toBlob()` → `POST /api/drawings/upload` → `POST /api/rooms/{id}/submit` med blob URL
- Viser nedtællingstimer (default 90s for tegning, 30s for gæt)

### Polling Hook (`useRoomPoll`)

```typescript
// Kalder GET /api/rooms/{id}/poll?playerId={id} hvert 2. sekund
// Opdaterer global state med RoomState
// Stopper polling når status === 'DONE'
```

### State Management

- Zustand store eller React Context
- Persisteret i `localStorage`: `myPlayerId`, `myRoomId`, `myRoomCode` (til reconnect ved reload)
- Poll-respons sætter: `roomStatus`, `currentRound`, `roundType`, `assignment`, `players`

---

## 10. Docker Setup

### `docker-compose.yml`

```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    container_name: hearsay-backend
    environment:
      - ASPNETCORE_URLS=http://+:5000
      - AZURE_BLOB_CONNECTION_STRING=${AZURE_BLOB_CONNECTION_STRING}
      - AZURE_BLOB_CONTAINER=hearsay
      - DB_PATH=/data/hearsay.duckdb
    volumes:
      - hearsay-data:/data
    ports:
      - "5000:5000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: hearsay-frontend
    ports:
      - "3000:80"
    restart: unless-stopped

volumes:
  hearsay-data:
```

### `backend/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Hearsay.Api.dll"]
```

### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### `frontend/nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:5000;
    }
}
```

> Cosmos Server reverse proxier til `frontend:3000`. Ingen WebSocket-konfiguration nødvendig.

---

## 11. Configuration Summary

| Variable                        | Where       | Description                          |
|--------------------------------|-------------|--------------------------------------|
| `AZURE_BLOB_CONNECTION_STRING` | backend env | Azure Storage connection string       |
| `AZURE_BLOB_CONTAINER`         | backend env | Blob container navn (`hearsay`)       |
| `DB_PATH`                      | backend env | DuckDB file path (`/data/hearsay.duckdb`) |
| `ASPNETCORE_URLS`              | backend env | `http://+:5000`                       |
| `VITE_API_BASE_URL`            | frontend build | Backend base URL for API-kald      |

---

## 12. Project Structure

```
hearsay/
├── backend/
│   ├── Hearsay.Api/
│   │   ├── Program.cs
│   │   ├── Endpoints/
│   │   │   ├── RoomsEndpoints.cs
│   │   │   └── DrawingsEndpoints.cs
│   │   ├── Services/
│   │   │   ├── GameService.cs         ← core game logic + round assignments
│   │   │   ├── DuckDbService.cs       ← DuckDB wrapper med semaphore
│   │   │   └── BlobStorageService.cs
│   │   └── Models/
│   │       ├── Room.cs
│   │       ├── Player.cs
│   │       ├── Chain.cs
│   │       └── ChainEntry.cs
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Lobby.tsx
│   │   │   ├── Play.tsx
│   │   │   └── Reveal.tsx
│   │   ├── components/
│   │   │   ├── DrawCanvas.tsx
│   │   │   └── GuessInput.tsx
│   │   ├── hooks/
│   │   │   └── useRoomPoll.ts         ← polling hvert 2s
│   │   └── store/
│   │       └── gameStore.ts
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .env                               ← AZURE_BLOB_CONNECTION_STRING etc.
```

---

## 13. Danske UI-tekster (reference)

| Kontekst              | Dansk tekst                                              |
|----------------------|----------------------------------------------------------|
| Startside - headline | "Hvad sker der egentlig?"                               |
| Opret rum            | "Opret spil"                                             |
| Deltag i rum         | "Deltag i spil"                                          |
| Indtast kode         | "Indtast rumkode"                                        |
| Dit navn             | "Dit navn"                                               |
| Lobby - venter       | "Venter på spillere..."                                  |
| Start spil (host)    | "Start spillet"                                          |
| Runde: skriv ord     | "Skriv et ord eller en sætning"                          |
| Runde: tegn          | "Tegn: **{word}**"                                       |
| Runde: gæt           | "Hvad forestiller denne tegning?"                        |
| Indsend              | "Indsend"                                                |
| Ryd                  | "Ryd"                                                    |
| Timer                | "Tid tilbage: {n}s"                                      |
| Venter på andre      | "Venter på de andre spillere..."                         |
| Reveal - titel       | "Hvad skete der?"                                        |
| Reveal - næste kæde  | "Næste kæde"                                             |
| Spil slut            | "Spillet er slut – tak for denne gang! 🎉"              |
| Fejl: rum ikke fundet| "Rummet blev ikke fundet. Tjek koden og prøv igen."     |
| Fejl: rum fuldt      | "Rummet er fuldt."                                       |
| Fejl: spil i gang    | "Spillet er allerede i gang."                            |

---

## 14. Out of Scope (v1)

- Authentication / user accounts (players are ephemeral per session)
- Persistent game history
- Custom timers per room (hardcode 90s draw / 30s guess)
- Spectator mode
- Rejoin after hard disconnect (reconnect by playerId in localStorage is sufficient)
