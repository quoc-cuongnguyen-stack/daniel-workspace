# daniel-workspace

Personal working copy. Not the SSL product repo ([quoc-cuongnguyen-stack/SSL](https://github.com/quoc-cuongnguyen-stack/SSL.git)).

SSL on disk stays untouched: no symlink, submodule, gitignore, or path change there. Cursor on SSL still reads SSL's own `.cursor/` and `daniel_workspace/`.

## Layout

- `workspace/` — copy of SSL `daniel_workspace/` (bug journal, qa-agent, mcp-server, cursor-sdk, …). `node_modules` and `.env` not copied.
- `harness/` — WIP agent harness (generic skills, hooks, `ponytail.mdc`). Not installed on SSL yet.

When the harness is done, install it into SSL (or another project) from this repo. Until then, keep finishing it here.
