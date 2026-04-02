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
