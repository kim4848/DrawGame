#!/bin/bash

set -e

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:5000/health}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-5}"
WAIT_SECONDS="${WAIT_SECONDS:-10}"

echo "🏥 Health check for: $HEALTH_URL"
echo "⏱️  Max attempts: $MAX_ATTEMPTS, wait: ${WAIT_SECONDS}s"
echo ""

# Retry logic
for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "Attempt $i/$MAX_ATTEMPTS..."

  if curl -f -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -q "200"; then
    echo "✅ Health check passed!"
    exit 0
  else
    if [ $i -lt $MAX_ATTEMPTS ]; then
      echo "⏳ Health check failed, retrying in ${WAIT_SECONDS}s..."
      sleep $WAIT_SECONDS
    fi
  fi
done

echo "❌ Health check failed after $MAX_ATTEMPTS attempts"
exit 1
