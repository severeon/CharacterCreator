# Worktree-Per-Agent Workflow

## Overview

Each agent works in an isolated git worktree. This prevents agents from stepping on each other's changes and keeps the main branch pristine.

## Creating a Worktree

```bash
# From the main repo
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name>
pnpm install
```

## Port Assignment

Each worktree needs a unique Vite port to avoid conflicts:

```bash
# Set in .worktrees/<name>/.env.local
VITE_PORT=1421  # main uses 1420, increment for each worktree
```

Update `vite.config.ts` to read this:

```typescript
server: {
  port: parseInt(process.env.VITE_PORT || "1420"),
}
```

## Shared Caches

- **pnpm**: Global store at `~/Library/pnpm/store` — all worktrees share downloaded packages
- **sccache**: Shared Rust compilation cache at `~/.cache/sccache` — configured via `.cargo/config.toml` in repo root

## Cleanup

```bash
# Remove a worktree
git worktree remove .worktrees/<branch-name>

# If worktree has uncommitted changes, either commit first or force remove:
git worktree remove .worktrees/<branch-name> --force

# Prune stale worktree references
git worktree prune
```

## Current Worktrees

| Worktree | Branch | Status |
|----------|--------|--------|
| (main) | `main` | Active — never work here directly |
| `.worktrees/milestone-2` | `feat/milestone-2` | Active |
| `.worktrees/milestone-1-content-browser` | `feat/milestone-1-content-browser` | Prunable |

Note: This table reflects the state at time of writing. Run `git worktree list` to see current worktrees.

## Rules

1. Never commit directly to `main` — always work in a worktree branch
2. Each worktree gets a unique `VITE_PORT`
3. Run `pnpm install` after creating a worktree (symlinks from global store, fast)
4. Cargo builds automatically share cache via sccache
