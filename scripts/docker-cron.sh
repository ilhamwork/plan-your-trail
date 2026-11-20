#!/bin/sh
set -e

CRON_SECRET="${CRON_SECRET:-test_cron_secret_lokal_12345}"
WEB_URL="${WEB_URL:-http://web:3000}"

# Helper function to trigger a cron endpoint and log result
trigger_cron() {
  endpoint="$1"
  name="$2"
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "[$timestamp] [CRON-TRIGGER] Running $name ($endpoint)..."
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $CRON_SECRET" "$WEB_URL$endpoint" || true)
  status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_STATUS")

  if [ "$status" = "200" ]; then
    echo "[$timestamp] [SUCCESS] $name (HTTP $status)"
  else
    echo "[$timestamp] [FAILED] $name (HTTP $status): $body"
  fi
}

# If run with a subcommand argument, execute that specific job
if [ "$1" = "run-daily-analytics" ]; then
  trigger_cron "/api/cron/daily-analytics" "Daily Analytics"
  exit 0
elif [ "$1" = "run-keep-alive" ]; then
  trigger_cron "/api/cron/keep-alive" "Keep-Alive & Cache Purge"
  exit 0
elif [ "$1" = "run-quota-monitor" ]; then
  trigger_cron "/api/cron/quota-monitor" "Quota Monitor"
  exit 0
fi

echo "========================================="
echo "PlanYourTrail Local Cron Runner Starting"
echo "Target Web URL: $WEB_URL"
echo "========================================="

# Ensure curl is installed in the container
if ! command -v curl >/dev/null 2>&1; then
  echo "Installing curl..."
  apk add --no-cache curl >/dev/null
fi

# Run initial verification jobs on startup
echo "Running startup verification jobs..."
trigger_cron "/api/cron/keep-alive" "Initial Keep-Alive"
trigger_cron "/api/cron/daily-analytics" "Initial Daily Analytics"

# Install crontab:
# - Keep-alive every 10 minutes: */10 * * * *
# - Quota monitor every 6 hours: 0 */6 * * *
# - Daily analytics every day at 00:05 UTC: 5 0 * * *
cat << 'EOF' > /etc/crontabs/root
*/10 * * * * /tmp/runner.sh run-keep-alive
0 */6 * * * /tmp/runner.sh run-quota-monitor
5 0 * * * /tmp/runner.sh run-daily-analytics
EOF

echo "Crontab installed successfully:"
crontab -l

echo "Starting crond in foreground..."
exec crond -f -l 2 -L /dev/stdout
