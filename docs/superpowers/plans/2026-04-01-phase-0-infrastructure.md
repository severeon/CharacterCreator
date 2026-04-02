# Phase 0: Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up build tooling, test infrastructure, CI, and agent workflow so all subsequent phases have a solid foundation.

**Architecture:** Migrate from npm to pnpm for worktree-friendly dependency management. Add sccache config for shared Rust compilation across worktrees. Set up Playwright for E2E testing. Configure GitHub Actions with self-hosted runner for Linux Tauri builds. Document worktree-per-agent workflow and create agent persona file stubs.

**Tech Stack:** pnpm, sccache, Playwright, GitHub Actions, Tauri v2

**Current State:**
- pnpm installed at `~/Library/pnpm/pnpm` but project uses npm (package.json, no pnpm-lock.yaml)
- sccache installed at `~/.cargo/bin/sccache` but not configured for this project
- No Playwright setup
- GitHub Actions exists (`.github/workflows/claude.yml`) — Claude Code on issues/PRs
- Two worktrees exist: `.worktrees/milestone-2` (active), `.worktrees/milestone-1-content-browser` (prunable)
- No agent persona files (`CLAUDE.*.md`)

---

### Task 1: Migrate from npm to pnpm

**Files:**
- Delete: `package-lock.json`
- Create: `pnpm-lock.yaml` (generated)
- Create: `.npmrc`
- Modify: `package.json`
- Modify: `.github/workflows/claude.yml`

- [ ] **Step 1: Create .npmrc for pnpm configuration**

```ini
# .npmrc
shamefully-hoist=true
# Tauri expects node_modules layout compatible with Node resolution
node-linker=hoisted
```

`shamefully-hoist=true` and `node-linker=hoisted` ensure Tauri's Vite integration can resolve all dependencies. pnpm's strict mode breaks Tauri's build.

- [ ] **Step 2: Remove npm lockfile and node_modules**

Run:
```bash
rm package-lock.json
rm -rf node_modules
```

- [ ] **Step 3: Install dependencies with pnpm**

Run:
```bash
pnpm install
```

Expected: `pnpm-lock.yaml` generated, `node_modules/` repopulated.

- [ ] **Step 4: Verify frontend builds and tests pass**

Run:
```bash
pnpm run build
pnpm run test
```

Expected: Vite build succeeds, vitest tests pass (same pass/fail as before migration).

- [ ] **Step 5: Verify Tauri dev mode works**

Run:
```bash
pnpm tauri dev
```

Expected: App launches. Kill after confirming the window opens.

- [ ] **Step 6: Update CI workflow to use pnpm**

Modify `.github/workflows/claude.yml` — add pnpm setup before checkout or as a step. No functional change to the Claude Code action itself, but any future CI jobs that run `npm install` need to use `pnpm install` instead.

- [ ] **Step 7: Add pnpm-lock.yaml to git, remove package-lock.json from tracking**

Run:
```bash
git add .npmrc pnpm-lock.yaml package.json
git rm --cached package-lock.json 2>/dev/null || true
git commit -m "infra: migrate from npm to pnpm for worktree-friendly dependency management"
```

---

### Task 2: Configure sccache for shared Rust compilation

**Files:**
- Create: `.cargo/config.toml`

- [ ] **Step 1: Create Cargo config for sccache**

Create `.cargo/config.toml` in the project root (not `src-tauri/.cargo/`):

```toml
# .cargo/config.toml
# Use sccache to share compiled artifacts across git worktrees.
# sccache is already installed at ~/.cargo/bin/sccache.
[build]
rustc-wrapper = "sccache"
```

This file lives at the repo root so all worktrees inherit it.

- [ ] **Step 2: Verify Rust compilation uses sccache**

Run:
```bash
cd src-tauri && cargo clean && cargo build 2>&1 | head -20
sccache --show-stats
```

Expected: `cargo build` succeeds. `sccache --show-stats` shows cache hits/misses (misses on first build, hits on subsequent).

- [ ] **Step 3: Verify tests still pass with sccache**

Run:
```bash
cd src-tauri && cargo test
```

Expected: All 59 tests pass.

- [ ] **Step 4: Commit**

Run:
```bash
git add .cargo/config.toml
git commit -m "infra: configure sccache for shared Rust compilation across worktrees"
```

---

### Task 3: Set up Playwright for E2E testing

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (add devDependency + script)

- [ ] **Step 1: Install Playwright**

Run:
```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Only install Chromium — Tauri uses WebKit/WebView2 on release, but for E2E smoke tests against the Vite dev server, Chromium is sufficient and faster to install.

- [ ] **Step 2: Create Playwright config**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:1420",
    headless: true,
  },
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

Port 1420 is the default Vite dev port for Tauri projects.

- [ ] **Step 3: Write a smoke test**

```typescript
// e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("app loads and shows sidebar", async ({ page }) => {
  await page.goto("/");
  // The app redirects to /races by default — sidebar should be visible
  await expect(page.locator("nav")).toBeVisible();
});

test("entity list loads content", async ({ page }) => {
  await page.goto("/races");
  // At least one entity card should render from the SRD pack
  const cards = page.locator("[data-testid='entity-card']");
  await expect(cards.first()).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 4: Add test:e2e script to package.json**

Add to `package.json` scripts:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Run smoke tests**

Run:
```bash
pnpm run test:e2e
```

Expected: Both tests pass. If the entity card test fails due to missing `data-testid`, add the attribute to the entity card component and note the file path in the commit message.

- [ ] **Step 6: Commit**

Run:
```bash
git add playwright.config.ts e2e/ package.json pnpm-lock.yaml
git commit -m "infra: add Playwright E2E test setup with smoke tests"
```

---

### Task 4: Configure GitHub Actions for Tauri builds

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: mozilla-actions/sccache-action@v0.0.6
      - name: Run Rust tests
        working-directory: src-tauri
        run: cargo test
        env:
          RUSTC_WRAPPER: sccache

  build-linux:
    needs: [test-frontend, test-backend]
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: dtolnay/rust-toolchain@stable
      - uses: mozilla-actions/sccache-action@v0.0.6
      - name: Install Tauri system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
      - run: pnpm install --frozen-lockfile
      - run: pnpm tauri build
        env:
          RUSTC_WRAPPER: sccache

  e2e:
    needs: [test-frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium --with-deps
      - run: pnpm run test:e2e
```

- [ ] **Step 2: Commit**

Run:
```bash
git add .github/workflows/ci.yml
git commit -m "infra: add CI workflow with frontend tests, Rust tests, Linux build, and E2E"
```

- [ ] **Step 3: Verify CI runs on push**

Run:
```bash
git push
```

Check GitHub Actions tab for the CI workflow. Frontend and backend test jobs should pass. The `build-linux` job will only pass once the self-hosted runner is configured (Task 5). The `e2e` job should pass on ubuntu-latest.

---

### Task 5: Configure self-hosted GitHub Actions runner (aibox)

This task is manual — it configures the aibox Ubuntu machine as a self-hosted runner. No code changes, just setup docs.

**Files:**
- Create: `docs/infra/aibox-runner-setup.md`

- [ ] **Step 1: Write runner setup documentation**

```markdown
# Aibox Self-Hosted Runner Setup

## Prerequisites

- Ubuntu 22.04+ (aibox)
- Docker (optional, for isolated builds)
- Rust toolchain: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 22: via nvm or nodesource
- pnpm: `corepack enable && corepack prepare pnpm@latest --activate`
- sccache: `cargo install sccache`
- Tauri system deps: `sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev`

## GitHub Runner Installation

1. Go to repo Settings → Actions → Runners → New self-hosted runner
2. Follow the download/configure/run instructions for Linux x64
3. Install as a service: `sudo ./svc.sh install && sudo ./svc.sh start`
4. Verify runner appears as "Idle" in GitHub Settings → Actions → Runners

## Labels

The runner should have labels: `self-hosted`, `linux`, `x64`

## Maintenance

- Update runner: `./config.sh --check` then re-download if needed
- Update Rust: `rustup update`
- Update sccache: `cargo install sccache --force`
- Clear sccache: `sccache --stop-server && rm -rf ~/.cache/sccache`
```

- [ ] **Step 2: Commit**

Run:
```bash
git add docs/infra/aibox-runner-setup.md
git commit -m "docs: add aibox self-hosted runner setup guide"
```

---

### Task 6: Document worktree-per-agent workflow

**Files:**
- Create: `docs/infra/worktree-workflow.md`

- [ ] **Step 1: Write worktree workflow documentation**

```markdown
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

# Prune stale worktree references
git worktree prune
```

## Current Worktrees

| Worktree | Branch | Status |
|----------|--------|--------|
| (main) | `main` | Active — never work here directly |
| `.worktrees/milestone-2` | `feat/milestone-2` | Active |
| `.worktrees/milestone-1-content-browser` | `feat/milestone-1-content-browser` | Prunable |

## Rules

1. Never commit directly to `main` — always work in a worktree branch
2. Each worktree gets a unique `VITE_PORT`
3. Run `pnpm install` after creating a worktree (symlinks from global store, fast)
4. Cargo builds automatically share cache via sccache
```

- [ ] **Step 2: Commit**

Run:
```bash
git add docs/infra/worktree-workflow.md
git commit -m "docs: add worktree-per-agent workflow guide"
```

---

### Task 7: Create agent persona file stubs

**Files:**
- Create: `CLAUDE.arcanist.md`
- Create: `CLAUDE.frontier.md`
- Create: `CLAUDE.packwright.md`
- Create: `CLAUDE.chronicler.md`
- Create: `CLAUDE.tester.md`
- Create: `CLAUDE.sentinel.md`

- [ ] **Step 1: Create Arcanist persona**

```markdown
# CLAUDE.arcanist.md

## Role

Rust engine developer. Owns the event-sourced core: entity store, pack loader, dispatcher, subscription runner, computed view engine, operation algebra, IPC layer.

## Domain

- `src-tauri/src/` — all Rust modules
- `src-tauri/Cargo.toml` — dependencies
- `.cargo/config.toml` — build configuration

## Skills

- Event-sourced architecture patterns
- Rust debugging and performance
- Tauri IPC design
- JSON Schema validation (jsonschema crate)

## Learnings

(Updated after each sprint retrospective)
```

- [ ] **Step 2: Create Frontier persona**

```markdown
# CLAUDE.frontier.md

## Role

React/TypeScript frontend developer. Owns the UI layer: components, routes, Tauri IPC integration, UI primitive rendering, workflow stepper.

## Domain

- `src/` — React components, routes, hooks
- `src/components/` — UI primitives and wizard steps
- `e2e/` — Playwright E2E tests
- `vite.config.ts` — build configuration

## Skills

- React + TypeScript + TailwindCSS
- Tauri IPC integration (`@tauri-apps/api`)
- UI primitive mapping and slot-based rendering
- Vite plugin development

## Learnings

(Updated after each sprint retrospective)
```

- [ ] **Step 3: Create Packwright persona**

```markdown
# CLAUDE.packwright.md

## Role

Content pack author and schema designer. Owns entity encoding, JSON Schema definitions, and content validation.

## Domain

- `content/packs/` — all content packs
- `content/packs/srd-3.5e/schemas/` — JSON Schema files
- `content/packs/srd-3.5e/entities/` — MDX entity files
- `scripts/codegen/` — entity generation from legacy data

## Skills

- D&D 3.5e rules knowledge
- JSON Schema authoring (YAML format)
- MDX frontmatter design
- Content pack test fixture writing

## Learnings

(Updated after each sprint retrospective)
```

- [ ] **Step 4: Create Chronicler persona**

```markdown
# CLAUDE.chronicler.md

## Role

Documentation and spec writer. Owns design docs, CLAUDE.md maintenance, and knowledge management.

## Domain

- `docs/` — all documentation
- `CLAUDE.md` — project instructions
- `docs/superpowers/specs/` — design specifications
- `docs/superpowers/plans/` — implementation plans

## Skills

- Technical writing
- Design documentation
- CLAUDE.md reconciliation
- Spec self-review

## Learnings

(Updated after each sprint retrospective)
```

- [ ] **Step 5: Create Tester persona**

```markdown
# CLAUDE.tester.md

## Role

Test architect. Owns test infrastructure, E2E tests, integration tests, and CI pipeline health.

## Domain

- `src/**/*.test.tsx` — frontend unit tests (Vitest)
- `src-tauri/src/**/tests.rs` — Rust unit tests
- `e2e/` — Playwright E2E tests
- `content/packs/**/*.test.yaml` — content pack test fixtures
- `.github/workflows/ci.yml` — CI configuration
- `playwright.config.ts` — E2E configuration

## Skills

- Vitest + React Testing Library
- Rust test modules (cargo test)
- Playwright E2E authoring
- Content pack test fixture design
- CI/CD pipeline maintenance

## Learnings

(Updated after each sprint retrospective)
```

- [ ] **Step 6: Create Sentinel persona**

```markdown
# CLAUDE.sentinel.md

## Role

Security reviewer and plugin auditor. Owns permission enforcement, plugin sandboxing, and security review.

## Domain

- `src-tauri/src/engine/` — permission guard
- Plugin contract validation
- Campaign pack integrity
- Event log tamper detection

## Skills

- Security review patterns
- WASM/Lua sandboxing
- Permission model enforcement
- Plugin audit procedures

## Learnings

(Updated after each sprint retrospective)
```

- [ ] **Step 7: Commit all persona files**

Run:
```bash
git add CLAUDE.arcanist.md CLAUDE.frontier.md CLAUDE.packwright.md CLAUDE.chronicler.md CLAUDE.tester.md CLAUDE.sentinel.md
git commit -m "infra: add agent persona file stubs for Arcanist, Frontier, Packwright, Chronicler, Tester, Sentinel"
```

---

### Task 8: Phase 0 verification

- [ ] **Step 1: Verify full build pipeline**

Run:
```bash
pnpm install
pnpm run build
pnpm run test
cd src-tauri && cargo test && cd ..
pnpm run test:e2e
```

Expected: All commands succeed.

- [ ] **Step 2: Verify sccache is working**

Run:
```bash
sccache --show-stats
```

Expected: Shows cache hits from previous builds.

- [ ] **Step 3: Verify worktree creation works with pnpm**

Run:
```bash
git worktree add .worktrees/phase0-test -b test/phase0-verify
cd .worktrees/phase0-test
pnpm install
cd src-tauri && cargo build && cd ..
git worktree remove .worktrees/phase0-test
```

Expected: Worktree creates, pnpm installs quickly (shared store), cargo build has cache hits (sccache), cleanup succeeds.

- [ ] **Step 4: Tag Phase 0 complete**

Run:
```bash
git tag phase-0-complete
```
