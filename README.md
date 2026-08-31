# daniel-workspace

Personal sandbox. Not [quoc-cuongnguyen-stack/SSL](https://github.com/quoc-cuongnguyen-stack/SSL.git). SSL stays untouched.

## Layout

- `harness/` — portable agent loop (`@cursor/sdk`) + generic skills/hooks. Not installed on SSL.
- `workspace/` — copy of SSL `daniel_workspace/` (bug journal, qa-agent, mcp-server, …).

## Setup

Needs Node 22+ and pnpm.

```bash
# 1. Harness (loop agent)
cd harness
pnpm install
cp .env.example .env          # set CURSOR_API_KEY
pnpm typecheck
export CURSOR_API_KEY=...     # or: node --env-file=.env --experimental-strip-types index.ts
pnpm start -- /path/to/project "list files"

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
