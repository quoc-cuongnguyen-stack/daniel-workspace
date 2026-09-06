# daniel-workspace

Personal sandbox. Not [quoc-cuongnguyen-stack/SSL](https://github.com/quoc-cuongnguyen-stack/SSL.git). SSL stays untouched.

## Layout

- `harness/` — portable agent loop (AI SDK + local Qwen) + generic skills/hooks. Not installed on SSL.
- `workspace/` — copy of SSL `daniel_workspace/` (bug journal, qa-agent, mcp-server, …).

## Setup

Needs Node 22+ and pnpm.

```bash
# 1. Harness (loop agent)
cd harness
pnpm install
cp .env.example .env          # LOCAL_BASE_URL + LOCAL_MODEL
pnpm typecheck
# Start Bionic/LM Studio OpenAI server on :1234, then:
pnpm start -- . "Read package.json, then tsconfig.json, then index.ts, then summarize everything"

# 2. MCP server
cd ../workspace/mcp-server
pnpm install
pnpm build

# 3. QA agent (SSL E2E — needs SSL running)
cd ../qa-agent
pnpm install
cp .env.example .env          # SSL_BASE_URL + test user
```

`pnpm start -- <project-cwd> "<prompt>"` points the loop at any repo. SSL is just a cwd; no files are written into it by setup.
