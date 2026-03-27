# AGENTS.md - Development Guide for Agents

This repository contains the D&D 3.5 gestalt character creator (vanilla HTML/CSS/JS) and supporting content-generation scripts.

---

## Commands

### Root Project (D&D Character Creator)

| Command | Description |
|---------|-------------|
| `python -m http.server 8080` | Serve app at <http://localhost:8080> |
| `open dnd35_gestalt_v4.html` | Run directly (offline mode, uses embedded data) |

---

## Project Structure

```
CharacterCreator/
├── dnd35_gestalt_v4.html   # Main app (all-in-one HTML/CSS/JS)
├── classes.js              # External class/race data
├── classes.json            # JSON mirror for drag-drop import
├── feats.js                # Feat definitions (reference)
├── styles.css              # Standalone styles
├── content/                # MDX content packs
├── scripts/                # Content generation scripts
└── docs/                   # Design documents
```

---

## Code Style Guidelines

### General

- **No comments** unless explicitly requested by user
- **No emojis** in code
- **Use existing patterns** - match surrounding code style
- **Avoid magic numbers** - use named constants

### JavaScript (Root - Vanilla)

- Use `const` over `let`, never `var`
- Prefer template literals over string concatenation
- Use strict equality (`===` / `!==`)
- Keep functions small and focused
- Global state via `S` (character state) and `DM` (campaign settings) objects

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `characterName` |
| Constants | UPPER_SNAKE | `MAX_LEVEL` |
| Functions | camelCase, verb prefix | `calculateHitPoints()` |
| Components | PascalCase | `CharacterSheet` |
| Files | kebab-case | `content-pack-loader.test.js` |

### Error Handling

- Use `try/catch` for async operations
- Display user-friendly error messages in UI
- Log errors to console with context
- Validate external data (content packs) at boundaries

---

## Data Sync (Important)

When editing `classes.js`, you MUST also update the `INLINE DATA FALLBACK` block in `dnd35_gestalt_v4.html` for offline mode to work. Search for that comment in the HTML file.

---

## CI

GitHub Actions runs Claude Code on issues/PRs tagged with `@claude`.
