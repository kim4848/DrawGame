# Deployment Guide

This document describes how to deploy the Hearsay (Rygtet Går) application.

## Architecture

The application consists of two Docker containers deployed behind Cosmos Server (reverse proxy + SSL):

- **Backend** — .NET 8 Minimal API on port 5000
- **Frontend** — React 18 + TypeScript served via nginx on port 3000

## Required Environment Variables

### Backend (Required)

| Variable | Description | Example |
|---|---|---|
| `AZURE_BLOB_CONNECTION_STRING` | Azure Storage connection string | `DefaultEndpointsProtocol=https;AccountName=...` |
| `AZURE_BLOB_CONTAINER` | Blob container name | `hearsay` |
| `DB_PATH` | DuckDB file path | `/data/hearsay.duckdb` |
| `ASPNETCORE_URLS` | Backend listen URL | `http://+:5000` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `your-super-secret-jwt-key-here` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `https://yourdomain.com,https://www.yourdomain.com` |

### Backend (Optional - Authentication)

| Variable | Description | Default |
|---|---|---|
| `JWT_ISSUER` | JWT issuer claim | `hearsay-api` |
| `JWT_AUDIENCE` | JWT audience claim | `hearsay-app` |
| `JWT_EXPIRATION_HOURS` | Token expiration in hours | `168` (7 days) |

### Backend (Optional - Payments)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_PRICE_ID` | Stripe Price ID for 29 DKK/month subscription |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Frontend (Required)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.yourdomain.com` |

## Current Deployment Process

### 1. Prepare Environment

Create a `.env` file in the project root with all required environment variables:

```bash
# Backend
AZURE_BLOB_CONNECTION_STRING=your-azure-connection-string
AZURE_BLOB_CONTAINER=hearsay
DB_PATH=/data/hearsay.duckdb
ASPNETCORE_URLS=http://+:5000
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
ALLOWED_ORIGINS=https://yourdomain.com
JWT_ISSUER=hearsay-api
JWT_AUDIENCE=hearsay-app
JWT_EXPIRATION_HOURS=168

# Optional: Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 2. Validate Environment

Run the validation script to ensure all required variables are set:

```bash
./scripts/validate-env.sh
```

### 3. Build and Deploy

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Verify health
./scripts/health-check.sh
```

### 4. Verify Deployment

- Check backend health: `curl http://localhost:5000/health`
- Check frontend: `curl http://localhost:3000`
- Check logs: `docker compose logs -f`

## Deployment Checklist

- [ ] All required environment variables are set
- [ ] Azure Blob Storage container exists and is accessible
- [ ] JWT_SECRET is at least 32 characters and cryptographically random
- [ ] ALLOWED_ORIGINS includes all production domains
- [ ] Stripe webhook endpoint is configured (if using payments)
- [ ] Database volume is properly mounted for persistence
- [ ] Cosmos Server reverse proxy is configured for SSL
- [ ] Health endpoint responds successfully
- [ ] Frontend can connect to backend API
- [ ] Test game creation and joining flow
- [ ] Monitor logs for errors

## Rollback Procedure

In case of deployment issues:

```bash
# Stop current deployment
docker compose down

# Revert to previous images
docker compose pull
docker compose up -d

# Or rebuild from previous git tag
git checkout <previous-tag>
docker compose build
docker compose up -d
```

## Monitoring

- Check application health: `GET /health`
- View logs: `docker compose logs -f`
- DuckDB database: `/data/hearsay.duckdb`
- Drawings storage: Azure Blob Storage container

## Troubleshooting

### Backend won't start

- Verify `AZURE_BLOB_CONNECTION_STRING` is valid
- Check `JWT_SECRET` is set and sufficiently long
- Ensure database path is writable: `DB_PATH=/data/hearsay.duckdb`

### Frontend can't connect to backend

- Verify `VITE_API_BASE_URL` matches backend URL
- Check CORS configuration: `ALLOWED_ORIGINS` includes frontend domain
- Ensure Cosmos Server reverse proxy is routing correctly

### Database issues

- DuckDB is single-writer; ensure only one backend instance writes
- Check volume mounts: `docker compose config`
- Backup database before major updates: `cp /data/hearsay.duckdb /data/hearsay.duckdb.backup`

## Security Notes

- **Never commit** `.env` files to version control
- Use `.env.example` as a template (with dummy values)
- Rotate `JWT_SECRET` periodically
- Use Azure Key Vault or similar for production secrets
- Enable Azure Blob Storage firewall rules
- Review CORS `ALLOWED_ORIGINS` carefully
