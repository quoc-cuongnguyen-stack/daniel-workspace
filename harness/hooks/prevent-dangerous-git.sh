#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // empty')

if [ -z "$COMMAND" ]; then
  echo '{"permission": "allow"}'
  exit 0
fi

# Block destructive git commands
if echo "$COMMAND" | grep -Eq '\bgit\s+(reset\s+.*--hard|clean\s+.*-[a-zA-Z]*f|branch\s+.*-D|checkout\s+(\.|--\s+\.)|restore\s+(\.|--worktree\s+\.))'; then
  echo '{"permission": "deny", "agentMessage": "Blocked: Dangerous git command detected. Destructive operations (reset --hard, clean -f, branch -D, checkout/restore .) are prohibited."}'
  exit 0
fi

echo '{"permission": "allow"}'
exit 0
