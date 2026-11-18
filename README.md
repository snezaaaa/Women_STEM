# STEM IS FOR YOU

An educational 3D browser game for the **Girls Go STEM** initiative (EIT), made for secondary-school girls (about 12–18).

The player is locked inside a science & technology museum after closing time. Someone has erased the names of women scientists from the exhibits. She restores each name by answering a question with up to three clues. Each restored name gives one letter. 4 rooms × 3 scientists = 12 letters that spell **STEM IS FOR YOU** (door codes STE → MIS → FOR → YOU). The game ends in a mirror room where the player's own character stands on the 13th pedestal.

It runs in desktop browsers, on phones and tablets, and on a classroom projector. It is built with Three.js and Vite in plain JavaScript, with no other runtime dependencies.

---

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev          # open the printed http://localhost:5173 link
```

To test on a phone in the same Wi-Fi, open the "Network" address that `npm run dev` prints.

Production build:

```bash
npm run build        # outputs to dist/
npm run preview      # serves dist/ at http://localhost:4173/Women_STEM/
```

## Edit the game content (no coding needed)

**All text lives in one file: [`src/data/content.json`](src/data/content.json).** Open it in any text editor (or edit it on GitHub with the ✏️ button) and save. The site rebuilds automatically after you push to `main`.

| Section | What it controls |
|---|---|
| `game` | Title, intro story (`intro` = list of short paragraphs), button labels, finale texts |
| `rooms[]` | One entry per room: `title`, door `code` (must have the same number of letters as the room has exhibits) |
| `rooms[].exhibits[]` | One entry per scientist (see below) |
| `characters[]` | The playable researchers on the select screen (see below) |

Fields of each **exhibit**:

```jsonc
{
  "id": "curie",                    // unique, no spaces
  "letter": "T",                    // the letter this exhibit gives (must match the room code, in order)
  "name": "Marie Curie",            // shown on the plaque after solving
  "achievement": "Nobel Prizes in Physics and Chemistry",   // short line under the name
  "silhouettes": ["bun"],           // plaque silhouette(s): bun, updo, short, long, waves, curls (2 entries = two people)
  "object": "vial",                 // 3D object in the case (list below)
  "question": "Which element did she name after her homeland?",
  "correct": "Polonium",
  "wrong": ["Oxygen", "Helium", "Neon"],   // exactly 3; buttons are shuffled
  "clues": ["clue 1", "clue 2", "clue 3"], // exactly 3
  "reveal": "Full text shown on the reveal card…"
}
```

Available case objects: `punchcard`, `vial`, `atom`, `xray`, `fission`, `piano`, `chalkboard`, `capsule`, `codestack`, `spool`, `crispr`, `saddle`.

Tips:
- Keep the JSON valid: strings in `"double quotes"`, commas between items, no comma after the last item. If the page stays blank after an edit, paste the file into <https://jsonlint.com> to find the typo.
- Write a quotation mark inside a text as `\"`.
- Changing the content resets nobody's game. Players on the same device keep their progress (saved in the browser). The **New game** button on the intro screen starts over.

## Scoring

Each exhibit shows clue 1 first. A correct answer after clue 1 gives ★★★, after clue 2 ★★, and after clue 3 ★. A wrong answer has no penalty: the card shakes gently and shows the next clue. After a third wrong answer the correct answer is highlighted, the player gets 0 stars and continues, so nobody gets stuck. The maximum is 36 stars. A timer can be shown for team competitions (checkbox on the intro screen). Elapsed time always appears on the summary screen.

## Controls

| | Desktop | Phone / tablet / projector |
|---|---|---|
| Walk | WASD or arrow keys, or click the floor | Tap the floor (a violet target ring and dotted path appear) |
| Inspect | Walk near a case (gold ring glows), then click it or press **E** | Tap the glowing case (tapping a far case walks there and opens it) |
| Close a card | × button or **Esc** | × button |

Progress (character, solved exhibits, stars, clue progress, time) is saved in `localStorage`, so a refresh does not restart the game.

## Deploy to GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes the game on every push to `main`. It can also be run by hand from the **Actions** tab.

One-time setup in the repository:
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main`. After about a minute the game is live at `https://<user>.github.io/<repo>/`, for example <https://snezaaaa.github.io/Women_STEM/>.

The Vite `base` path comes from the repository name automatically (`BASE_PATH=/<repo>/` in the workflow, default `/Women_STEM/`). For a custom domain or a user site at the root, set `BASE_PATH=/`.

## Automated play-through test

`tests/playthrough.mjs` drives the real game in a headless Chromium. On desktop it plays all 12 exhibits with a mix of 0–3 wrong answers, checks the star rules, the 4 door codes, that doors open and block, a mid-game refresh, the mirror finale, the summary (★ 18 / 36) and Play again. It also runs touch input in a phone viewport. Screenshots go to `tests/screenshots/`.

```bash
npm i -D playwright && npx playwright install chromium   # once
npm run build && npm test
```

## Project structure

```
index.html
vite.config.js
src/
  main.js              game loop and state (intro → select → play → finale → summary)
  style.css            UI overlay styles
  data/content.json    ALL texts, questions, characters  ← edit me
  game/museum.js       rooms, walls, doors + keypads, display cases, plaques, lights, mirror hall
  game/exhibits.js     the 12 symbolic case objects (procedural low-poly)
  game/character.js    rigged + animated researchers (procedural) and optional GLB loader
  game/player.js       movement, collision, A* pathfinding, tap target & dotted path
  game/textures.js     canvas-drawn textures: floor, silhouettes, plaques, keypads
  game/audio.js        synthesized sound effects (Web Audio)
  game/save.js         localStorage save (wrapped in try/catch)
  ui/ui.js             HUD, screens, clue/reveal cards
tests/playthrough.mjs  automated end-to-end check
```

## Characters, 3D models and licences

The six researchers (Amara, Leyla with a hijab, Mei with glasses, Sofia, Priya, Zoe with glasses) are **built in code** in `src/game/character.js`. No model files need downloading. Each one is a rigged bone hierarchy (hips, spine, chest, neck, head, arms, hands, legs, feet, hair) with realistic proportions (about 1.65 m) and keyframed **idle**, **walk** and **cheer** animations played by a Three.js `AnimationMixer`. Skin tone, hair style and colour, outfit (lab coat or jacket with jeans), hijab and glasses are set per character in `content.json`. This code is part of this project, so no third-party licence applies.

### Optional: use downloaded animated models instead

Any character can use a GLB model in place of the built-in one:

1. Download a rigged, animated character as `.glb` (it needs an idle and a walk animation). Good free sources:
   - **Quaternius**: "Ultimate Animated Character Pack" / "Universal Animation Library", licence **CC0** – <https://quaternius.com>
   - **Mixamo** (free with an Adobe account; characters and animations may be used in projects) – <https://www.mixamo.com>. Export as FBX, then convert to GLB (e.g. with Blender: File → Import FBX → Export glTF 2.0 binary).
2. Put the file in `public/models/`, e.g. `public/models/researcher1.glb`.
3. In `content.json`, set the character's fields:
   ```json
   "model": "models/researcher1.glb",
   "modelScale": 1,
   "animations": { "idle": "Idle", "walk": "Walk" }
   ```
   `animations` are the clip names inside the file (partial matches work, e.g. `"Walk"` matches `"CharacterArmature|Walk"`). The model should face +Z and be about 1.6–1.8 units tall (adjust `modelScale`).
4. If the file is missing or broken, the game logs a warning and falls back to the built-in character, so it never breaks.

Please keep characters school-appropriate (no revealing clothing), and list each model and its licence in the table below.

### Third-party assets

| Asset | Source | Licence |
|---|---|---|
| three.js | <https://threejs.org> | MIT |
| Optimer Bold typeface (3D room titles), shipped with three.js | MgOpen fonts | MgOpen licence (free use, modification and redistribution) |
| Vite (build tool) | <https://vitejs.dev> | MIT |

There are no photos of real people anywhere in the game. All scientists appear as generic stylised silhouettes drawn in code. All sounds are synthesized at runtime, with no audio files and no music.
