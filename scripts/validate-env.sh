#!/bin/bash

set -e

echo "🔍 Validating environment variables..."

# Required variables
REQUIRED_VARS=(
  "AZURE_BLOB_CONNECTION_STRING"
  "JWT_SECRET"
  "ALLOWED_ORIGINS"
)

# Optional variables (will warn if missing)
OPTIONAL_VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_PRICE_ID"
  "STRIPE_WEBHOOK_SECRET"
  "VITE_PUBLIC_SITE_URL"
)

# Track errors
ERRORS=0
WARNINGS=0

# Check required variables
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ ERROR: Required variable $VAR is not set"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ $VAR is set"
  fi
done

# Check JWT_SECRET length
if [ -n "$JWT_SECRET" ]; then
  JWT_LENGTH=${#JWT_SECRET}
  if [ $JWT_LENGTH -lt 32 ]; then
    echo "❌ ERROR: JWT_SECRET must be at least 32 characters (current: $JWT_LENGTH)"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ JWT_SECRET length is sufficient ($JWT_LENGTH chars)"
  fi
fi

# Check optional variables
echo ""
echo "🔔 Checking optional variables..."
for VAR in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "⚠️  WARNING: Optional variable $VAR is not set (payment features may not work)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "✅ $VAR is set"
  fi
done

# Validate URL format for VITE_PUBLIC_SITE_URL if set
if [ -n "$VITE_PUBLIC_SITE_URL" ]; then
  if [[ ! "$VITE_PUBLIC_SITE_URL" =~ ^https?:// ]]; then
    echo "❌ ERROR: VITE_PUBLIC_SITE_URL must start with http:// or https://"
    ERRORS=$((ERRORS + 1))
  else
    # Check for common typos in domain
    if [[ "$VITE_PUBLIC_SITE_URL" =~ kjserf ]]; then
      echo "❌ ERROR: VITE_PUBLIC_SITE_URL contains 'kjserf' - did you mean 'kjsoft'?"
      ERRORS=$((ERRORS + 1))
    fi
    echo "✅ VITE_PUBLIC_SITE_URL format is valid"
  fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -gt 0 ]; then
  echo "❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  Validation passed with $WARNINGS warning(s)"
  exit 0
else
  echo "✅ All environment variables validated successfully!"
  exit 0
fi
