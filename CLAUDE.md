# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A single-page browser app for building D&D 3.5 gestalt characters. No build step, no framework, no dependencies — just HTML/CSS/JS served statically.

## Running Locally

```sh
python -m http.server 8080
# then open http://localhost:8080/dnd35_gestalt_v4.html
```

No server is needed to open the file directly, but `classes.js` is only loaded in server mode (browser security blocks local file imports). Double-click mode uses the `INLINE DATA FALLBACK` section embedded inside the HTML.

## File Roles

| File | Role |
|------|------|
| `dnd35_gestalt_v4.html` | Entire app: CSS, HTML structure, all JS logic, and inline data fallback |
| `classes.js` | External data file loaded at runtime (server mode only) — races, classes, prestige prereqs |
| `classes.json` | JSON mirror of `classes.js` — used for the drag-and-drop import feature |
| `feats.js` | Feat definitions (currently embedded in HTML; this file is a reference/export) |
| `temp_spells.js` | Untracked scratch file — not loaded by the app |

## Architecture

Everything lives in `dnd35_gestalt_v4.html`. Key structural regions (searchable by comment):

- **`INLINE DATA FALLBACK`** — copy of the `classes.js` arrays embedded for offline use. Must be kept in sync with `classes.js` when data changes.
- **`SPELLCASTING DATA`** (~line 4339) — `SPELL_SLOTS`, `SPELLS_KNOWN_TABLE`, `POWER_POINTS`, `POWERS_KNOWN`, `WARLOCK_INVOCATIONS`, `SPELL_LIBRARY`, `POWER_LIBRARY` constants.
- **Render functions** — `renderLevels()`, `renderSkills()`, `renderFeats()`, `renderSpells()`, `renderSheet()`, `renderAbilities()` each own one tab's output.
- **State object `S`** — single global object holding all character data (scores, class picks, feat slots, skill ranks, etc.).
- **DM object `DM`** — campaign-level settings (ability score method, point buy budget, enabled/disabled content, password lock).
- **Modals** — class picker (`_cpicker`), race picker, feat picker (`_fpicker`), template picker, choice modal — opened/closed with `open*/close*` function pairs.

## Data Schemas

**`CLASSES` entry** (in `classes.js`):
```js
{n, s, hd, bab, fort, ref, will, sp, cs[], f[], prestige?, maxLvl?, special?}
```

**`RACES` entry**:
```js
{cat, name, la, rhd, rhdType, bonuses{str,dex,...}, traits[]}
```

**`PRESTIGE_PREREQS` entry**:
```js
"Class Name": {bab?, str/dex/con/int/wis/cha?, feats[]?, skills{}?, casterLevel?,
               casterType?, minCasterSpellLevel?, requiresPsionic?,
               minPsionicPowerLevel?, alignment?, minSize?, special?}
```

## Syncing Data Between Files

When editing `classes.js`, also update the `INLINE DATA FALLBACK` block inside `dnd35_gestalt_v4.html` if you want offline (double-click) mode to reflect the change. Search for `INLINE DATA FALLBACK` to find the exact location.

## CI

GitHub Actions (`claude.yml`) runs Claude Code on issues/PRs when tagged with `@claude`.
