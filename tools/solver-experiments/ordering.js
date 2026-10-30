// Move-ordering experiment. For every test position, runs the solver's
// depth-first search (stopping at the first win) with one ordering of the
// candidate moves, up to CAP moves, and records the move count at which the
// position was resolved (win found, or every position explored). Any smaller
// budget B is then answered by "resolved iff at <= B", so one run per position
// gives the whole curve.
//
//   node ordering.js <variant> <shard> <shards> <cap> <out.json>
//
// Variants reorder the move groups built by SolverState.generateMoves (after
// its safe-move shortcut, which stays):
//   base        current order: foundation, uncovering (most face-down cards first), waste, other tableau, stock, from foundation
//   uncAsc      uncover the column with the fewest face-down cards first
//   kingLate    move a King into an empty column only after other uncovering moves
//   wasteFirst  waste moves before uncovering moves
//   stockEarly  stock moves before other tableau moves
//   foundLate   (non-safe) foundation moves after uncovering moves
//   otherLast   tableau moves that uncover nothing go last
const fs = require("fs");
const { loadGame, testPositions } = require("./lib");

const [variant, shard, shards, cap, outFile] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const DEALS = +(process.env.DEALS || 576);
const SEED = 2026;

const ORDERING = `
const ORDER = ${JSON.stringify(variant)};
SolverState.prototype.generateMoves = function () {
  const n = this.up.length;
  for (let i = 0; i < n; i++) {
    const up = this.up[i];
    if (!up.length) continue;
    const card = up[up.length - 1], slot = this.foundationSlotFor(card);
    if (slot >= 0 && this.isSafeToFoundation(card)) return [packMove(MOVE.TABLEAU_TO_FOUNDATION, i, slot)];
  }
  const toFoundation = [], uncovering = [], fromWaste = [], otherTableau = [], fromStock = [], fromFoundation = [];
  let firstEmpty = -1;
  for (let j = 0; j < n; j++) if (!this.up[j].length && !this.down[j].length) { firstEmpty = j; break; }
  const targetOk = (j) => this.up[j].length || this.down[j].length || j === firstEmpty;
  for (let i = 0; i < n; i++) {
    const up = this.up[i];
    if (!up.length) continue;
    const slot = this.foundationSlotFor(up[up.length - 1]);
    if (slot >= 0) toFoundation.push(packMove(MOVE.TABLEAU_TO_FOUNDATION, i, slot));
    for (let k = 0; k < up.length; k++) for (let j = 0; j < n; j++) {
      if (j === i || !targetOk(j) || !this.tableauAccepts(j, up[k])) continue;
      if (k === 0 && !this.down[i].length && !this.up[j].length) continue;
      if (k > 0 && this.foundationSlotFor(up[k - 1]) < 0) continue;
      const m = packMove(MOVE.TABLEAU_TO_TABLEAU, i, j, up.length - k);
      if (k === 0 && this.down[i].length) uncovering.push(m); else otherTableau.push(m);
    }
  }
  for (const { card, turns } of this.reachableWasteCards()) {
    const slot = this.foundationSlotFor(card);
    if (slot >= 0) (turns ? fromStock : toFoundation).push(packMove(MOVE.WASTE_TO_FOUNDATION, 0, slot, 1, turns));
    for (let j = 0; j < n; j++) if (targetOk(j) && this.tableauAccepts(j, card)) (turns ? fromStock : fromWaste).push(packMove(MOVE.WASTE_TO_TABLEAU, 0, j, 1, turns));
  }
  for (let s = 0; s < 4; s++) {
    if (!this.fHeight[s]) continue;
    const card = (this.fHeight[s] - 1) * 4 + this.fSuit[s];
    for (let j = 0; j < n; j++) if (this.up[j].length && this.tableauAccepts(j, card)) fromFoundation.push(packMove(MOVE.FOUNDATION_TO_TABLEAU, s, j));
  }
  const downOf = (m) => this.down[moveFrom(m)].length;
  const intoEmpty = (m) => (this.up[moveTo(m)].length ? 0 : 1);
  if (ORDER === "uncAsc") uncovering.sort((a, b) => downOf(a) - downOf(b));
  else if (ORDER === "kingLate") uncovering.sort((a, b) => intoEmpty(a) - intoEmpty(b) || downOf(b) - downOf(a));
  else uncovering.sort((a, b) => downOf(b) - downOf(a));
  const groups = {
    base: [toFoundation, uncovering, fromWaste, otherTableau, fromStock, fromFoundation],
    uncAsc: [toFoundation, uncovering, fromWaste, otherTableau, fromStock, fromFoundation],
    kingLate: [toFoundation, uncovering, fromWaste, otherTableau, fromStock, fromFoundation],
    wasteFirst: [toFoundation, fromWaste, uncovering, otherTableau, fromStock, fromFoundation],
    stockEarly: [toFoundation, uncovering, fromWaste, fromStock, otherTableau, fromFoundation],
    foundLate: [uncovering, toFoundation, fromWaste, otherTableau, fromStock, fromFoundation],
    otherLast: [toFoundation, uncovering, fromWaste, fromStock, fromFoundation, otherTableau],
  }[ORDER];
  if (!groups) throw new Error("unknown variant " + ORDER);
  return [].concat(...groups);
};`;

// Positions come from an unmodified game (the walk doesn't use generateMoves),
// then the variant's ordering is patched in for the search.
const game = loadGame(SEED);
const all = testPositions(game, DEALS, SEED);
const mine = all.map((p, i) => ({ ...p, i })).filter((p) => p.i % shards === shard);
const patched = loadGame(SEED, ORDERING);

function resolve(rootState) {
  const state = new patched.SolverState(3);
  Object.assign(state, rootState.clone());
  if (state.isWon()) return { result: "winnable", at: 0 };
  const stack = [{ state, moves: state.generateMoves(), next: 0 }];
  const seen = new Set([state.key()]);
  let tried = 0;
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.next >= frame.moves.length) {
      stack.pop();
      continue;
    }
    if (tried >= cap) return { result: "unknown", at: null };
    const child = frame.state.clone().apply(frame.moves[frame.next++]);
    tried++;
    const key = child.key();
    if (seen.has(key)) continue;
    seen.add(key);
    if (child.isWon()) return { result: "winnable", at: tried };
    stack.push({ state: child, moves: child.generateMoves(), next: 0 });
  }
  return { result: "unwinnable", at: tried };
}

const rows = [];
const started = Date.now();
mine.forEach((p, n) => {
  rows.push({ i: p.i, fresh: p.fresh, ...resolve(p.state) });
  if ((n + 1) % 100 === 0 || n + 1 === mine.length)
    console.log(`${variant} shard ${shard}: ${n + 1}/${mine.length} positions, ${((Date.now() - started) / 1000).toFixed(0)}s`);
});
fs.writeFileSync(outFile, JSON.stringify({ variant, shard, cap, rows }));
