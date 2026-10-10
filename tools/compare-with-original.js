// Regression check: plays the same scripted session on original/ and decompiled/
// with a seeded Math.random (so both deal the same game) and compares the model
// state plus every card's position / z-index / face after each step.
//
// Usage (from the repo root):
//   python3 -m http.server 8731 --directory original &
//   python3 -m http.server 8732 --directory decompiled &
//   node tools/compare-with-original.js [screenshot-dir]
//
// Uses the locally installed Google Chrome (CHROME env var overrides the path).
const fs = require("fs");
const puppeteer = require("puppeteer-core");
const OUT = process.argv[2] || __dirname + "/out/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SEED = `(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; window.confirm = () => true; })();`;
const targets = { orig: "http://localhost:8731/", dec: "http://localhost:8732/" };
const state = () => {
  const c = window.solitaireController, m = c.model;
  const names = (p) => p.map((card) => card.rank.letter() + card.suit.letter()).join(" ");
  return JSON.stringify({ stock: names(m.stock), waste: names(m.waste), f: m.foundations.map(names),
    up: m.faceUpTableauPiles.map(names), down: m.faceDownTableauPiles.map((p) => p.length), score: m.score, undo: m.undoStack.length,
    pos: Object.values(c.cardControllers).map((cc) => cc.element.style.left + "," + cc.element.style.top + "," + cc.element.style.zIndex + "," + cc.element.classList.contains("cardback")).join("|") });
};
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--window-size=1100,800"] });
  const results = {};
  for (const [name, url] of Object.entries(targets)) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setRequestInterception(true);
    page.on("request", (r) => (/localhost/.test(r.url()) ? r.continue() : r.abort()));
    await page.evaluateOnNewDocument(SEED);
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.solitaireController && window.solitaireController.model);
    // hide the (blocked) ad slot and cookie banner on the original page
    await page.addStyleTag({ content: ".adsense-container,.cc-window{display:none!important}" });
    const steps = [];
    const snap = async (label) => {
      await new Promise((r) => setTimeout(r, 1500));
      steps.push([label, await page.evaluate(state)]);
      await page.screenshot({ path: `${OUT}/${name}-${String(steps.length).padStart(2, "0")}-${label}.png` });
    };
    const cardRect = async (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 15 }; }, sel);
    const idOf = (expr) => page.evaluate(`(() => { const m = solitaireController.model; const c = ${expr}; return c ? "#" + c.id : null; })()`);
    await snap("deal");
    // click stock 3 times
    for (let i = 0; i < 3; i++) { const p = await cardRect(await idOf("m.stock[m.stock.length-1]")); await page.mouse.click(p.x, p.y); await new Promise(r=>setTimeout(r,500)); }
    await snap("turned");
    // try every legal tableau->tableau / waste->tableau drag found by model, up to 4 moves
    for (let k = 0; k < 4; k++) {
      const mv = await page.evaluate(() => {
        const c = solitaireController, m = c.model;
        const sources = [["waste"], ...m.faceUpTableauPiles.map((_, i) => ["faceUpTableauPiles", i])];
        for (const src of sources) { const pile = m.getCollection(src); if (!pile.length) continue;
          const cards = src[0] === "waste" ? [pile[pile.length - 1]] : [pile[0]];
          const run = m.movedWithCard(cards[0]);
          for (let i = 0; i < 7; i++) { if (src[1] === i) continue; if (m.accepts(["faceUpTableauPiles", i], run)) {
            const from = c.getCardController(run[0]).element.getBoundingClientRect();
            const dz = c.dropZoneFor(["faceUpTableauPiles", i]); const root = c.rootElement.getBoundingClientRect();
            return { fx: from.x + 30, fy: from.y + 10, tx: root.x + dz.left + 30, ty: root.y + dz.top + 40 }; } } }
        return null; });
      if (!mv) break;
      await page.mouse.move(mv.fx, mv.fy); await page.mouse.down(); 
      for (let s = 1; s <= 10; s++) await page.mouse.move(mv.fx + (mv.tx - mv.fx) * s / 10, mv.fy + (mv.ty - mv.fy) * s / 10);
      await page.mouse.up();
      await snap("drag" + k);
    }
    // double-click any ace to foundation
    const ace = await page.evaluate(() => { const m = solitaireController.model; for (const p of [m.waste, ...m.faceUpTableauPiles]) { const c = p[p.length - 1]; if (c && c.rank.letter() === "A") return "#" + c.id; } return null; });
    if (ace) { const p = await cardRect(ace); await page.mouse.click(p.x, p.y, { clickCount: 2 }); await snap("ace"); }
    // undo twice
    for (let i = 0; i < 2; i++) { await page.click(".solitr-undo-button"); await snap("undo" + i); }
    // invalid drag snaps back: drag tableau 0 top card onto stock area
    { const id = await idOf("m.faceUpTableauPiles[0][m.faceUpTableauPiles[0].length-1]"); const p = await cardRect(id);
      await page.mouse.move(p.x, p.y); await page.mouse.down(); for (let s=1;s<=10;s++) await page.mouse.move(p.x + 40*s, p.y + 30*s); await page.mouse.up(); await snap("snapback"); }
    // run through the whole stock + turn over waste
    for (let i = 0; i < 12; i++) { const id = await idOf("m.stock[m.stock.length-1]"); if (!id) break; const p = await cardRect(id); await page.mouse.click(p.x, p.y); await new Promise(r=>setTimeout(r,400)); }
    await snap("stock-empty");
    await page.evaluate(() => document.querySelector("#turnOverWasteImage").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await snap("turned-over");
    // score toggle
    await page.evaluate(() => { $("#solitr-option-score").prop("checked", true).change(); });
    await snap("score");
    // forced win
    await page.evaluate(() => { window.SOLITR_WIN = true; solitaireController.turnStock(); });
    await snap("win");
    results[name] = { steps, errors };
    await page.close();
  }
  await browser.close();
  const o = results.orig.steps, d = results.dec.steps;
  console.log("errors orig:", results.orig.errors, "\nerrors dec:", results.dec.errors);
  for (let i = 0; i < Math.max(o.length, d.length); i++) {
    const same = o[i] && d[i] && o[i][1] === d[i][1];
    console.log(String(i + 1).padStart(2), (o[i] || [])[0], (d[i] || [])[0], same ? "SAME" : "DIFF");
    if (!same && o[i] && d[i]) { const a = JSON.parse(o[i][1]), b = JSON.parse(d[i][1]); for (const k in a) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log("   ", k, "\n     orig:", JSON.stringify(a[k]).slice(0, 300), "\n     dec: ", JSON.stringify(b[k]).slice(0, 300)); }
  }
})();
