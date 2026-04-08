# URL Configuration Fix Guide

## Problem
The application is displaying a malformed URL "iraw.apps.kjserf.dk" instead of the correct domain "apps.kjsoft.dk" in share links.

## Root Cause
Share links use `window.location.origin`, which reflects the URL the browser used to access the site. The malformed URL indicates:
1. Server reverse proxy (Cosmos Server) is configured with wrong domain, OR
2. DNS record points to wrong domain, OR  
3. Users are accessing via incorrect URL

## Solution

### 1. Set Correct Environment Variable (Immediate Fix)

Add this to your production server's `.env` file:

```bash
VITE_PUBLIC_SITE_URL=https://apps.kjsoft.dk
```

**Important:** The correct domain is `apps.kjsoft.dk` (not `kjserf.dk`)

### 2. Rebuild and Redeploy

After setting the environment variable:

```bash
cd /path/to/hearsay
docker compose down
docker compose up --build -d
```

### 3. Verify the Fix

1. Access the application
2. Create or join a room
3. Check the share link - it should show `https://apps.kjsoft.dk/join/XXXX`

### 4. Fix Server Configuration (Recommended)

Check and correct these configurations:

#### Cosmos Server Configuration
- Verify the domain/hostname is set to `apps.kjsoft.dk`
- Check for typos in domain configuration
- Ensure SSL certificate matches the correct domain

#### DNS Configuration
- Confirm DNS A/AAAA record points to correct server IP
- Remove any incorrect DNS records (like `iraw.apps.kjserf.dk`)

#### CORS Configuration
The backend's `ALLOWED_ORIGINS` should match:
```bash
ALLOWED_ORIGINS=https://apps.kjsoft.dk
```

### 5. Validation

Run the validation script before deploying:

```bash
./scripts/validate-env.sh
```

This will check for:
- Required environment variables
- Correct URL format
- Common typos (like "kjserf" instead of "kjsoft")

## Prevention

1. Always use the environment variable `VITE_PUBLIC_SITE_URL` in production
2. Run validation script before each deployment
3. Double-check domain spelling in all configurations
4. Test share links after deployment

## Quick Reference

| Environment Variable | Correct Value |
|---|---|
| `VITE_PUBLIC_SITE_URL` | `https://apps.kjsoft.dk` |
| `ALLOWED_ORIGINS` | `https://apps.kjsoft.dk` |

## Need Help?

If the issue persists after these fixes:
1. Check Cosmos Server logs for proxy errors
2. Verify DNS propagation: `dig apps.kjsoft.dk`
3. Test direct access to backend: `curl http://localhost:5000/health`
4. Review nginx logs in the frontend container
