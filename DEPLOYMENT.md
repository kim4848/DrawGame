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

### Frontend (Optional but Recommended)

| Variable | Description | Example |
|---|---|---|
| `VITE_PUBLIC_SITE_URL` | Public site URL for share links and redirects | `https://apps.kjsoft.dk` |

**Note:** If not set, share links will use `window.location.origin` (browser's current URL).

## Automated Deployment (GitHub Actions)

### Prerequisites

Configure the following GitHub secrets in your repository settings (`Settings → Secrets and variables → Actions`):

| Secret | Description | Example |
|---|---|---|
| `DEPLOY_HOST` | Production server hostname or IP | `your-server.com` or `192.168.1.100` |
| `DEPLOY_USER` | SSH username on production server | `deploy` or `ubuntu` |
| `DEPLOY_SSH_KEY` | Private SSH key for authentication | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `DEPLOY_PATH` | Absolute path to application on server | `/home/deploy/hearsay` |

### Deploying via GitHub Actions

1. **Navigate to Actions tab** in your GitHub repository
2. **Select "Deploy to Production"** workflow from the left sidebar
3. **Click "Run workflow"** button
4. **Type "deploy"** in the confirmation field to proceed
5. **Click "Run workflow"** to start deployment

The workflow will:
- ✅ Validate environment variables on the server
- ✅ Pull latest code from `main` branch
- ✅ Stop current containers
- ✅ Build and start new containers
- ✅ Run health checks
- ✅ Report success or failure

### Setting Up SSH Access

On your production server:

```bash
# Create deployment user (if not exists)
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Generate SSH key pair (on your local machine)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# Copy public key to server
ssh-copy-id -i deploy_key.pub deploy@your-server.com

# Add private key to GitHub secrets
cat deploy_key | pbcopy  # macOS
# or
cat deploy_key  # Linux - copy output manually
```

Then add the private key content to GitHub as `DEPLOY_SSH_KEY`.

### Monitoring Deployment

- Watch the workflow run in GitHub Actions tab
- Each step shows real-time logs
- Health check confirms successful deployment
- Failures trigger automatic notifications

## Manual Deployment Process

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

### Via GitHub Actions

If a deployment fails or causes issues:

1. **Identify the last working commit/tag** from git history
2. **Revert the main branch** to that commit:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```
3. **Run the deployment workflow** again from GitHub Actions

### Manual Rollback

SSH into the production server:

```bash
ssh deploy@your-server.com
cd /path/to/hearsay

# Stop current deployment
docker compose down

# Revert to previous commit
git checkout <previous-tag-or-commit>

# Rebuild and start
docker compose build
docker compose up -d

# Verify health
./scripts/health-check.sh
```

### Emergency Rollback (Fastest)

If you need to rollback immediately without rebuilding:

```bash
# Stop containers
docker compose down

# Restore previous Docker images (if cached)
docker compose pull
docker compose up -d
```

## Monitoring

- Check application health: `GET /health`
- View logs: `docker compose logs -f`
- DuckDB database: `/data/hearsay.duckdb`
- Drawings storage: Azure Blob Storage container

## Troubleshooting

### GitHub Actions Deployment Failures

**SSH connection failed**
- Verify `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_SSH_KEY` secrets are correctly set
- Ensure the SSH key has no passphrase
- Check server firewall allows SSH connections from GitHub Actions IPs
- Test SSH locally: `ssh -i deploy_key deploy@your-server.com`

**Environment validation failed**
- Ensure `.env` file exists on the server at `$DEPLOY_PATH`
- Verify all required environment variables are set
- Run `./scripts/validate-env.sh` manually on server to see specific errors

**Health check failed**
- Check if containers started: `docker compose ps`
- Review container logs: `docker compose logs -f`
- Verify port 5000 is not blocked by firewall
- Increase `MAX_ATTEMPTS` in health check if server is slow to start

**Deployment timeout**
- GitHub Actions has 6-hour job timeout by default
- For large images, consider pre-building on server
- Check network connectivity between GitHub and server

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
