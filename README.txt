D&D 3.5 Gestalt Character Creator
==================================

FILES
-----
  dnd35_gestalt_v4.html   — The app
  classes.js              — Editable data: races, classes, feats, skills, etc.
  README.txt              — This file

TWO WAYS TO USE
---------------

MODE 1 — Double-click (no setup needed)
  Just open dnd35_gestalt_v4.html directly.
  All data is embedded inside the HTML file so it works immediately.
  classes.js is IGNORED in this mode (browser security blocks local files).

MODE 2 — Local server (classes.js is live)
  When served over HTTP, the app loads classes.js and uses IT instead.
  Edit classes.js, refresh browser — changes appear instantly.

  To start the server:
    1. Open a terminal / command prompt
    2. cd path/to/this/folder
    3. python -m http.server 8080
    4. Open: http://localhost:8080/dnd35_gestalt_v4.html
    5. Stop: Ctrl+C

EDITING classes.js (server mode only)
--------------------------------------
Open classes.js in any text editor. The data is plain JavaScript arrays.
After saving, just refresh the browser tab — no restart needed.

To ADD a base class, add to the CLASSES array:
  {n:"My Class", s:"Homebrew", hd:10, bab:"full",
   fort:"good", ref:"poor", will:"poor", sp:4,
   cs:["Climb","Intimidate","Jump"],
   f:["Cool Ability","Another Ability"]},

To ADD a prestige class, add prestige:true and optionally maxLvl:
  {n:"My PrC", s:"Homebrew", prestige:true, hd:8, bab:"medium",
   fort:"good", ref:"poor", will:"poor", sp:2, maxLvl:5,
   cs:["Craft","Knowledge(Arcana)"],
   f:["Special Power","Greater Power"],
   special:"BAB +5, some feat"},

To ADD entry requirements, add to PRESTIGE_PREREQS:
  "My PrC": {bab:5, feats:["Power Attack"], skills:{"Intimidate":8},
             casterLevel:3, casterType:"arcane", alignment:"evil",
             minSize:"Large"},

KEEPING HTML IN SYNC
---------------------
If you edit classes.js and want those changes to also work in
double-click mode, paste the edited array into the matching section
inside dnd35_gestalt_v4.html (search for "INLINE DATA FALLBACK").
Or just always use server mode.

FIELD REFERENCE
---------------
  n          — Class name (must be unique)
  s          — Sourcebook
  hd         — 4 / 6 / 8 / 10 / 12
  bab        — "full" / "medium" / "poor"
  fort/ref/will — "good" / "poor"
  sp         — Skill points per level
  cs         — Array of class skill names
  f          — Array of class feature names
  prestige   — true for prestige classes
  maxLvl     — Max class level (default 10)
  special    — Entry requirement text

PREREQ FIELDS (PRESTIGE_PREREQS)
----------------------------------
  bab, str/dex/con/int/wis/cha, feats[], skills{},
  casterLevel, casterType, minCasterSpellLevel,
  requiresPsionic, minPsionicPowerLevel,
  alignment, minSize, special
