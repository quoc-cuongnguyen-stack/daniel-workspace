#!/usr/bin/env bash
# check_jaeger.sh — Check and auto-start Jaeger for local tracing
# Usage: bash daniel_workspace/local_tracing/scripts/check_jaeger.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="jaeger"
PROMETHEUS_CONTAINER="prometheus"
JAEGER_UI_PORT=16686
OTLP_PORT=4318
PROMETHEUS_PORT=9090

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking Jaeger v2 SPM tracing environment..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    echo "   Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "   Please start Docker Desktop first"
    exit 1
fi

# Ensure docker compose services are running
echo "🚀 Starting local tracing services via Docker Compose..."
(cd "${SCRIPT_DIR}" && docker compose up -d)

# Wait a moment for containers to initialize
sleep 2

# Validate endpoints
echo ""
echo "🔗 Validating endpoints..."

if curl -sf "http://localhost:${JAEGER_UI_PORT}/api/services" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Jaeger UI:       http://localhost:${JAEGER_UI_PORT} (SPM Monitor Tab enabled)${NC}"
else
    echo -e "${YELLOW}⏳ Jaeger UI not ready yet (may need a few more seconds)${NC}"
fi

if curl -sf "http://localhost:${OTLP_PORT}" > /dev/null 2>&1 || \
   curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${OTLP_PORT}/v1/traces" 2>&1 | grep -qE "^(200|405|415)$"; then
    echo -e "${GREEN}✅ OTLP HTTP:       http://localhost:${OTLP_PORT}/v1/traces${NC}"
else
    echo -e "${YELLOW}⏳ OTLP endpoint not ready yet (may need a few more seconds)${NC}"
fi

if curl -sf "http://localhost:${PROMETHEUS_PORT}/-/healthy" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Prometheus UI:   http://localhost:${PROMETHEUS_PORT}${NC}"
else
    echo -e "${YELLOW}⏳ Prometheus endpoint not ready yet (may need a few more seconds)${NC}"
fi

echo ""
echo "📌 To start backend with tracing:"
echo "   cd ssl-be"
echo "   NODE_OPTIONS=\"--import ../daniel_workspace/local_tracing/instrumentation.mjs\" pnpm start:dev"

