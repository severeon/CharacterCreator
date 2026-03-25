# D&D 3.5 Gestalt Character Creator

A browser-based tool for building D&D 3.5 gestalt characters, supporting base classes, prestige classes, feats, and prerequisite checking.

## Files

| File | Description |
|------|-------------|
| `dnd35_gestalt_v4.html` | The app |
| `classes.js` | Editable data: races, classes, skills, etc. |
| `classes.json` | JSON version of class data |
| `feats.js` | Feat definitions |
| `spells.js` | Spell and psionic power reference data |

## Two Ways to Use

### Mode 1 — Double-click (no setup needed)

Open `dnd35_gestalt_v4.html` directly in your browser. All data is embedded inside the HTML file so it works immediately. `classes.js` is ignored in this mode (browser security blocks local files).

### Mode 2 — Local server (`classes.js` is live)

When served over HTTP, the app loads `classes.js` and uses it instead of the embedded data. Edit `classes.js`, refresh the browser — changes appear instantly.

**To start the server:**

```sh
cd path/to/this/folder
python -m http.server 8080
```

Then open: `http://localhost:8080/dnd35_gestalt_v4.html`

Stop with `Ctrl+C`.

## Editing `classes.js` (server mode only)

Open `classes.js` in any text editor. The data is plain JavaScript arrays. After saving, refresh the browser tab — no restart needed.

**Add a base class** to the `CLASSES` array:

```js
{n:"My Class", s:"Homebrew", hd:10, bab:"full",
 fort:"good", ref:"poor", will:"poor", sp:4,
 cs:["Climb","Intimidate","Jump"],
 f:["Cool Ability","Another Ability"]},
```

**Add a prestige class** (include `prestige:true` and optionally `maxLvl`):

```js
{n:"My PrC", s:"Homebrew", prestige:true, hd:8, bab:"medium",
 fort:"good", ref:"poor", will:"poor", sp:2, maxLvl:5,
 cs:["Craft","Knowledge(Arcana)"],
 f:["Special Power","Greater Power"],
 special:"BAB +5, some feat"},
```

**Add entry requirements** to `PRESTIGE_PREREQS`:

```js
"My PrC": {bab:5, feats:["Power Attack"], skills:{"Intimidate":8},
           casterLevel:3, casterType:"arcane", alignment:"evil",
           minSize:"Large"},
```

## Keeping HTML in Sync

If you edit `classes.js` and want those changes to also work in double-click mode, paste the edited array into the matching section inside `dnd35_gestalt_v4.html` (search for `INLINE DATA FALLBACK`). Or just always use server mode.

## Field Reference

### Class fields (`CLASSES`)

| Field | Values |
|-------|--------|
| `n` | Class name (must be unique) |
| `s` | Sourcebook |
| `hd` | `4` / `6` / `8` / `10` / `12` |
| `bab` | `"full"` / `"medium"` / `"poor"` |
| `fort` / `ref` / `will` | `"good"` / `"poor"` |
| `sp` | Skill points per level |
| `cs` | Array of class skill names |
| `f` | Array of class feature names |
| `prestige` | `true` for prestige classes |
| `maxLvl` | Max class level (default `10`) |
| `special` | Entry requirement text |

### Prereq fields (`PRESTIGE_PREREQS`)

`bab`, `str` / `dex` / `con` / `int` / `wis` / `cha`, `feats[]`, `skills{}`, `casterLevel`, `casterType`, `minCasterSpellLevel`, `requiresPsionic`, `minPsionicPowerLevel`, `alignment`, `minSize`, `special`
Credits added
