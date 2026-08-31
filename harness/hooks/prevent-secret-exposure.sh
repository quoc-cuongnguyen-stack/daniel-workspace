#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // empty')

if [ -z "$COMMAND" ]; then
  echo '{"permission": "allow"}'
  exit 0
fi

# Block commands that read or dump .env files directly
if echo "$COMMAND" | grep -Eq '(cat|head|tail|less|more|bat)\s+([a-zA-Z0-9_\.\/]*\.env(\s|$))'; then
  echo '{"permission": "deny", "agentMessage": "Blocked: Direct reading or dumping of .env files is prohibited to prevent secret leakage."}'
  exit 0
fi

# Block commands that echo known sensitive credentials
if echo "$COMMAND" | grep -Eq '(echo|printf)\s+.*(GEMINI_API_KEY|SSL_TEST_PASSWORD|stp-[a-zA-Z0-9]+)'; then
  echo '{"permission": "deny", "agentMessage": "Blocked: Printing secrets in terminal output is prohibited."}'
  exit 0
fi

echo '{"permission": "allow"}'
exit 0
