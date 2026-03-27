# AGENTS.md - Development Guide for Agents

This repository contains two projects:

1. **Root**: D&D 3.5 gestalt character creator (vanilla HTML/CSS/JS)
2. **webapp/**: Next.js content pack loader (React 19, Tailwind 4)

---

## Commands

### Root Project (D&D Character Creator)

| Command | Description |
|---------|-------------|
| `python -m http.server 8080` | Serve app at <http://localhost:8080> |
| `open dnd35_gestalt_v4.html` | Run directly (offline mode, uses embedded data) |

### webapp/ (Next.js)

| Command | Description |
|---------|-------------|
| `cd webapp && npm run dev` | Start dev server at <http://localhost:3000> |
| `cd webapp && npm run build` | Production build |
| `cd webapp && npm run lint` | Run ESLint |
| `cd webapp && npm run lint -- --fix` | Auto-fix lint issues |
| `cd webapp && npm run test` | Run all tests (vitest) |
| `cd webapp && npm run test:watch` | Watch mode |
| `cd webapp && npm run test -- --run content-pack-loader.test.js` | Run single test file |
| `cd webapp && npm run test -- --run -t "parses a race correctly"` | Run single test by name |

---

## Project Structure

```
CharacterCreator/
├── dnd35_gestalt_v4.html   # Main app (all-in-one HTML/CSS/JS)
├── classes.js              # External class/race data
├── classes.json            # JSON mirror for drag-drop import
├── feats.js                # Feat definitions (reference)
├── styles.css              # Standalone styles
├── webapp/                 # Next.js content pack loader
│   ├── src/
│   │   ├── lib/            # Library code
│   │   └── __tests__/      # Test files (*.test.js)
│   ├── content/            # Markdown content packs
│   └── public/            # Static assets
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

### JavaScript (webapp/ - Next.js/React)

- Use ES modules (`import` / `export`)
- Prefer functional components with hooks
- Use React 19 patterns (no `useClient` unless needed for interaction)
- TypeScript optional but use JSDoc if types helpful
- Follow Next.js App Router conventions

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

### Testing (webapp/)

- Test files: `src/__tests__/*.test.js`
- Use Vitest with Node environment
- Follow existing pattern: `describe` blocks with `it` cases
- Use `expect` assertions from Vitest
- Create fixtures inline or in `__fixtures__` directories

---

## Data Sync (Important)

When editing `classes.js`, you MUST also update the `INLINE DATA FALLBACK` block in `dnd35_gestalt_v4.html` for offline mode to work. Search for that comment in the HTML file.

---

## CI

GitHub Actions runs Claude Code on issues/PRs tagged with `@claude`.
