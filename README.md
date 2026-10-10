# solitr – Klondike solitaire, decompiled from solitr.com

| Folder        | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `original/`   | Files exactly as served by https://www.solitr.com/ (untouched)             |
| `decompiled/` | Readable, runnable rewrite of the same game (Klondike only)                |
| `tools/`      | Scripts that produced `decompiled/` and check it still behaves the same    |

## Running

No build step. Open `decompiled/index.html` directly, or serve it:

```sh
python3 -m http.server 8732 --directory decompiled   # http://localhost:8732/
```

`index.html` plays Turn 3, and `index.html?turn=1` plays Turn 1.

## original/

```
index.html                      Turn 3 page ("/")
klondike-turn-one.html          Turn 1 page ("/klondike-turn-one")
assets/application-67cf….js     the whole site's JS: jQuery, Bootstrap, jQuery UI, underscore,
                                cookie banner, and Klondike + Spider + Mahjong game code
assets/application-302f….map    source map (no sources, but includes the original identifier names)
assets/solitaire-1x-….css       all CSS; card images embedded as data: URIs
assets/solitaire-2x-….css       the same, with retina images
assets/shim.min-….js            polyfills for old browsers
images/original/paris-….svg     the vector card deck the card images were rendered from
```

## How decompiled/ was made

1. **Restored names.** The source map's mappings line up exactly with the minified bundle
   (31,529 named tokens checked, 0 mismatches). `tools/unminify.js` gives every one of the
   4,126 bindings its original name. It renames by scope with Babel, so shadowing stays correct.
2. **Split libraries.** `tools/split-bundle.js` breaks the bundle into its 21 top-level parts.
   `tools/decompile-vendor.sh` puts them back together as `decompiled/vendor/*.js`, one file
   per library, with names restored. Dropped: the cookie banner, jquery.cookie, and the game code.
3. **Ported the game by hand.** The game code was Babel-compiled ES2015 classes. It is rewritten as
   plain classes in `decompiled/js/`, keeping the original class, method and variable names and
   the same logic and timings. Spider and Mahjong were left out.
4. **Extracted images.** `tools/extract-css-images.py` writes the embedded images to
   `decompiled/images/{1x,2x}/`. `tools/generate-cards-css.py` writes `css/cards.css`, which
   uses `image-set()` to pick 1x or 2x images.
5. **Verified.** `tools/compare-with-original.js` plays the same scripted session on both
   versions with a seeded `Math.random`: deal, turn stock, drag, double-click to foundation,
   undo, invalid drop, recycle the waste, score toggle, win dialog. After every step it
   compares the model and every card's position, z-index and face. All 11 steps are identical.

## decompiled/ layout

```
index.html                          page markup; loads everything in order (plain <script>s, no modules)
js/util.js                          assert, range, last, shuffle, minBy, fastClick, new-game confirmation
js/cards.js                         Rank, Suit, CardModel
js/command.js                       SolitaireCommand – every state change, and how undo works
js/models/solitaire-base-model.js   piles/locators, executeCommand, do*/undo* implementations, score
js/models/klondike-model.js         Klondike rules: deal, accepts(), scoring, auto-finish, isWon
js/controllers/card-controller.js   one card <div>: resting state, move/flip animations
js/controllers/solitaire-base-controller.js
                                    board: layout → resting states, animation pipeline,
                                    click/drag/drop input, undo, win dialog, speeds
js/controllers/klondike-controller.js
                                    Klondike geometry, stock/waste clicks, double-click to foundation
js/rawdraggable.js                  thin jQuery UI mouse widget used for drag and drop
js/main.js                          picks Turn 1/3, page-level handlers
css/solitr.css                      header / menu / dialogs
css/game.css                        table, card outlines
css/cards.css                       card faces (generated)
images/1x, images/2x                card faces 79×123 / 158×246, card back, recycle icon
vendor/                             libraries pulled from the original bundle
```

### Where to change things

| Want to change…                         | Look at                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Rules (what goes where)                 | `KlondikeModel.accepts`, `movedWithCard`                                |
| Dealing / seeded deals                  | `KlondikeModel.deal`, `shuffle` in `util.js`                            |
| Scoring                                 | `KlondikeModel.scoreForCommand`, `KlondikeTurnOneModel.scoreForCommand` |
| Cards turned per click                  | `KlondikeTurnOneModel.cardsToTurn` / `KlondikeTurnThreeModel.cardsToTurn` |
| Auto-finish behaviour                   | `KlondikeModel.nextAutoCommand`                                         |
| Layout / spacing / fanning              | `calculateGeometry` in the base controller and `KlondikeController`     |
| Animation speeds                        | `SolitaireBaseController.speeds`                                        |
| Card artwork                            | replace PNGs in `images/1x` and `images/2x` (keep the file names); card size is `CardController.size` |
| A new kind of move                      | new `action`: add `doX`/`undoX` to the model, `animateX` to the controller (see `command.js`) |

Debug helpers in the console: `solitaireController.dump()` returns a snippet that restores the
current position. `solitaireController._visualizeDropZones(cards)` shows where cards can be
dropped. Setting `window.SOLITR_WIN = true` makes the next move trigger the win dialog.

### Differences from the original

- Removed: Google Analytics, AdSense, Muscula error tracking, cookie banner, the Spider,
  Mahjong and Sudoku tabs, the old-browser shim, and an IE-only `unselectable` hack.
- One page with `?turn=1` instead of two separate pages.
- Added `<meta charset="utf-8">`. The original page has no charset, so the ♠ in the tab can show
  as garbled text.
- The About dialog is rewritten (credits kept). The original was the site owner's contact and
  company details.
- `loadHash` (debug only) restores `SolitaireCommand.prototype` correctly. The original set
  `__proto__` to the constructor.
- `.dummy { visibility: none }` (invalid) became `hidden`. The element is empty, so nothing looks different.

## Regenerating / checking

```sh
cd tools && npm install
./decompile-vendor.sh                      # rebuild decompiled/vendor from original/
python3 extract-css-images.py ../original/assets/solitaire-1x-*.css ../decompiled/images/1x   # (then drop the .svg icons you don't need)
python3 generate-cards-css.py
# with both folders served on 8731 (original) and 8732 (decompiled):
node compare-with-original.js              # screenshots go to tools/out/screenshots
```

`tools/out/parts/part020.js` is the original game code with names restored, including Spider
and Mahjong. Use it as a reference when changing `decompiled/js/`.
