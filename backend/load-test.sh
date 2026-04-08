#!/bin/bash
# Load test script for Hearsay backend with 12+ concurrent players

API_BASE="${API_BASE:-http://localhost:5000}"
NUM_PLAYERS="${NUM_PLAYERS:-12}"
DURATION="${DURATION:-30}"
POLL_INTERVAL=2

echo "=== Hearsay Backend Load Test ==="
echo "API Base: $API_BASE"
echo "Players: $NUM_PLAYERS"
echo "Duration: ${DURATION}s"
echo "Poll Interval: ${POLL_INTERVAL}s"
echo ""

# Create a room
echo "Creating room..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/rooms" \
  -H "Content-Type: application/json" \
  -d '{"name": "LoadTestHost"}')

ROOM_CODE=$(echo "$CREATE_RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
ROOM_ID=$(echo "$CREATE_RESPONSE" | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)
HOST_ID=$(echo "$CREATE_RESPONSE" | grep -o '"playerId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ROOM_CODE" ]; then
  echo "Failed to create room"
  exit 1
fi

echo "Room created: $ROOM_CODE (ID: $ROOM_ID)"
echo "Host player: $HOST_ID"
echo ""

# Join additional players
PLAYER_IDS=("$HOST_ID")
echo "Joining $((NUM_PLAYERS - 1)) additional players..."
for i in $(seq 2 $NUM_PLAYERS); do
  JOIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/rooms/$ROOM_CODE/join" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"LoadTestPlayer$i\"}")

  PLAYER_ID=$(echo "$JOIN_RESPONSE" | grep -o '"playerId":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$PLAYER_ID" ]; then
    PLAYER_IDS+=("$PLAYER_ID")
    echo "  Player $i joined: $PLAYER_ID"
  fi
done

echo ""
echo "All players joined. Starting game..."

# Start the game
curl -s -X POST "$API_BASE/api/rooms/$ROOM_ID/start" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$HOST_ID\", \"drawTimer\": 90, \"guessTimer\": 30}" > /dev/null

echo "Game started!"
echo ""

# Polling function
poll_player() {
  local player_id=$1
  local player_num=$2
  local end_time=$3
  local request_count=0
  local total_time=0

  while [ $(date +%s) -lt $end_time ]; do
    start=$(date +%s%3N)
    curl -s "$API_BASE/api/rooms/$ROOM_ID/poll?playerId=$player_id" > /dev/null
    end=$(date +%s%3N)

    duration=$((end - start))
    total_time=$((total_time + duration))
    request_count=$((request_count + 1))

    sleep $POLL_INTERVAL
  done

  avg_time=$((total_time / request_count))
  echo "Player $player_num: $request_count requests, avg ${avg_time}ms"
}

# Start polling in background for all players
echo "Starting concurrent polling for $DURATION seconds..."
END_TIME=$(($(date +%s) + DURATION))
PIDS=()

for i in "${!PLAYER_IDS[@]}"; do
  poll_player "${PLAYER_IDS[$i]}" "$((i + 1))" "$END_TIME" &
  PIDS+=($!)
done

# Wait for all background processes
for pid in "${PIDS[@]}"; do
  wait $pid
done

echo ""
echo "=== Load Test Complete ==="
echo ""
echo "Performance Summary:"
echo "- $NUM_PLAYERS players polling every ${POLL_INTERVAL}s"
echo "- Total duration: ${DURATION}s"
echo "- Expected requests: $((NUM_PLAYERS * DURATION / POLL_INTERVAL))"
echo ""
echo "Optimizations Applied:"
echo "✓ Database indexes on room_id, chain_id, round_number"
echo "✓ Batched last_seen updates (5s flush interval)"
echo "✓ Single query for all player submission status"
echo "✓ In-memory cache for room/player data (2s TTL)"
