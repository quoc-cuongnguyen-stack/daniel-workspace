#!/usr/bin/env bash
# query_traces.sh — Quick Jaeger API query shortcuts
# Usage:
#   ./query_traces.sh --errors                    # Error traces (last 1h)
#   ./query_traces.sh --errors --last 30          # Error traces (last 30 min)
#   ./query_traces.sh --slow 2000                 # Traces slower than 2000ms
#   ./query_traces.sh --slow 2000 --last 60       # Slow traces (last 60 min)
#   ./query_traces.sh --op "POST /api/v1/invite"  # Traces for specific operation
#   ./query_traces.sh --services                  # List all registered services
#   ./query_traces.sh --summary                   # Quick health summary

set -euo pipefail

JAEGER_API="http://localhost:16686/api"
SERVICE="ssl-be-local"
LIMIT=20
LOOKBACK="1h"
MODE=""
SLOW_MS=""
OPERATION=""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --errors)
            MODE="errors"
            shift
            ;;
        --slow)
            MODE="slow"
            SLOW_MS="$2"
            shift 2
            ;;
        --op|--operation)
            MODE="operation"
            OPERATION="$2"
            shift 2
            ;;
        --last)
            LOOKBACK="${2}m"
            shift 2
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --services)
            MODE="services"
            shift
            ;;
        --summary)
            MODE="summary"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Modes:"
            echo "  --errors              Show error traces"
            echo "  --slow <ms>           Show traces slower than <ms> milliseconds"
            echo "  --op <operation>      Show traces for specific operation"
            echo "  --services            List all registered services"
            echo "  --summary             Quick health summary"
            echo ""
            echo "Options:"
            echo "  --last <minutes>      Lookback window (default: 60 = 1h)"
            echo "  --limit <n>           Max traces to return (default: 20)"
            echo "  --service <name>      Service name (default: ssl-be-local)"
            echo "  -h, --help            Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage"
            exit 1
            ;;
    esac
done

# Check jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required. Install: brew install jq${NC}"
    exit 1
fi

# Check Jaeger is reachable
if ! curl -sf "${JAEGER_API}/services" > /dev/null 2>&1; then
    echo -e "${RED}❌ Jaeger is not reachable at ${JAEGER_API}${NC}"
    echo "   Run: bash daniel_workspace/local_tracing/scripts/check_jaeger.sh"
    exit 1
fi

case "${MODE}" in
    services)
        echo -e "${CYAN}📡 Registered services:${NC}"
        curl -s "${JAEGER_API}/services" | jq -r '.data[]' | sort
        ;;

    errors)
        echo -e "${RED}🔴 Error traces (service=${SERVICE}, lookback=${LOOKBACK}, limit=${LIMIT}):${NC}"
        echo ""
        ENCODED_TAGS=$(python3 -c "import urllib.parse; print(urllib.parse.quote('{\"error\":\"true\"}'))")
        curl -s "${JAEGER_API}/traces?service=${SERVICE}&tags=${ENCODED_TAGS}&limit=${LIMIT}&lookback=${LOOKBACK}" | \
            jq -r '.data[] | "TraceID: \(.traceID)\n  Spans: \(.spans | length)\n  Root:   \(.spans[0].operationName)\n  Time:   \(.spans[0].startTime / 1000000 | strftime("%Y-%m-%d %H:%M:%S UTC"))\n  Errors: \([.spans[] | select(.tags[]? | select(.key=="error" and .value==true)) | .operationName] | join(", "))\n"'
        ;;

    slow)
        if [[ -z "${SLOW_MS}" ]]; then
            echo -e "${RED}❌ --slow requires a threshold in milliseconds${NC}"
            exit 1
        fi
        DURATION_US=$((SLOW_MS * 1000))
        echo -e "${YELLOW}🐌 Slow traces > ${SLOW_MS}ms (service=${SERVICE}, lookback=${LOOKBACK}):${NC}"
        echo ""
        curl -s "${JAEGER_API}/traces?service=${SERVICE}&minDuration=${DURATION_US}&limit=${LIMIT}&lookback=${LOOKBACK}" | \
            jq -r '.data[] | "TraceID: \(.traceID)\n  Root:     \(.spans[0].operationName)\n  Duration: \(.spans[0].duration / 1000)ms\n  Time:     \(.spans[0].startTime / 1000000 | strftime("%Y-%m-%d %H:%M:%S UTC"))\n  Slowest:  \([.spans[] | {op: .operationName, dur: (.duration / 1000)}] | sort_by(-.dur) | .[0:3][] | "\(.op) (\(.dur)ms)") \n"'
        ;;

    operation)
        if [[ -z "${OPERATION}" ]]; then
            echo -e "${RED}❌ --op requires an operation name${NC}"
            exit 1
        fi
        ENCODED_OP=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${OPERATION}'))")
        echo -e "${CYAN}🔎 Traces for operation '${OPERATION}' (lookback=${LOOKBACK}):${NC}"
        echo ""
        curl -s "${JAEGER_API}/traces?service=${SERVICE}&operation=${ENCODED_OP}&limit=${LIMIT}&lookback=${LOOKBACK}" | \
            jq -r '.data[] | "TraceID: \(.traceID)\n  Duration: \(.spans[0].duration / 1000)ms\n  Time:     \(.spans[0].startTime / 1000000 | strftime("%Y-%m-%d %H:%M:%S UTC"))\n  Status:   \(if (.spans[] | .tags[]? | select(.key=="error" and .value==true)) then "❌ ERROR" else "✅ OK" end)\n"'
        ;;

    summary)
        echo -e "${CYAN}📊 Tracing Health Summary (service=${SERVICE}, lookback=${LOOKBACK})${NC}"
        echo ""

        # Total traces
        TOTAL=$(curl -s "${JAEGER_API}/traces?service=${SERVICE}&limit=100&lookback=${LOOKBACK}" | jq '.data | length')
        echo -e "  Total traces:  ${GREEN}${TOTAL}${NC}"

        # Error traces
        ENCODED_TAGS=$(python3 -c "import urllib.parse; print(urllib.parse.quote('{\"error\":\"true\"}'))")
        ERRORS=$(curl -s "${JAEGER_API}/traces?service=${SERVICE}&tags=${ENCODED_TAGS}&limit=100&lookback=${LOOKBACK}" | jq '.data | length')
        echo -e "  Error traces:  ${RED}${ERRORS}${NC}"

        # Slow traces (>1s)
        SLOW=$(curl -s "${JAEGER_API}/traces?service=${SERVICE}&minDuration=1000000&limit=100&lookback=${LOOKBACK}" | jq '.data | length')
        echo -e "  Slow (>1s):    ${YELLOW}${SLOW}${NC}"

        # Operations
        echo ""
        echo -e "${CYAN}  Top operations:${NC}"
        curl -s "${JAEGER_API}/operations?service=${SERVICE}" | jq -r '.data[]' 2>/dev/null | head -10 | while read -r op; do
            echo "    - ${op}"
        done
        ;;

    *)
        echo "Usage: $0 --errors | --slow <ms> | --op <name> | --services | --summary"
        echo "       Use --help for full options"
        ;;
esac
