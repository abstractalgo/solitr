// Search-strategy experiment. Same test positions and move generator
// (SolverState.generateMoves) as ordering.js; what changes is how the search
// backtracks. For every position, records the move count at which it was
// resolved (win found, or proven lost) within CAP moves.
//
//   node strategies.js <strategy> <shard> <shards> <cap> <out.json>
//
// Strategies:
//   dfs            the app's depth-first search (baseline)
//   lds            limited discrepancy search: iteration k explores every line
//                  that leaves the preferred (first) move at most k times
//   lds-rank       same, but taking the i-th move costs i discrepancies
//   restarts-geo   depth-first with a move budget per run (1000, 2000, 4000, …);
//                  every restart shuffles the move order a little
//   restarts-luby  same, budgets 1000 × Luby sequence (1, 1, 2, 1, 1, 2, 4, …)
//
// Restarts only find wins (they never prove a game lost); compare.js also
// scores each strategy paired with dfs, the budget split between the two.
const fs = require("fs");
const { loadGame, testPositions } = require("./lib");

const [strategy, shard, shards, cap, outFile] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const DEALS = +(process.env.DEALS || 576);
const SEED = 2026;

const game = loadGame(SEED);
const all = testPositions(game, DEALS, SEED);
const mine = all.map((p, i) => ({ ...p, i })).filter((p) => p.i % shards === shard);

class OutOfMoves extends Error {}

// Counts every move tried (one clone + apply), across restarts and iterations.
class Budget {
  constructor(cap) {
    this.cap = cap;
    this.tried = 0;
  }
  spend() {
    if (this.tried >= this.cap) throw new OutOfMoves();
    this.tried++;
  }
}

// Depth-first, stops at the first win. `limit`: moves for this run (Infinity =
// until the budget runs out). `order(moves)` may reorder each node's moves.
// Returns "winnable", "unwinnable" (every position explored) or "cut" (limit hit).
function dfs(root, budget, limit = Infinity, order = (moves) => moves) {
  const stop = budget.tried + limit;
  const stack = [{ state: root, moves: order(root.generateMoves()), next: 0 }];
  const seen = new Set([root.key()]);
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.next >= frame.moves.length) {
      stack.pop();
      continue;
    }
    if (budget.tried >= stop) return "cut";
    budget.spend();
    const child = frame.state.clone().apply(frame.moves[frame.next++]);
    const key = child.key();
    if (seen.has(key)) continue;
    seen.add(key);
    if (child.isWon()) return "winnable";
    stack.push({ state: child, moves: order(child.generateMoves()), next: 0 });
  }
  return "unwinnable";
}

// Iteration k: every line whose choices cost at most k discrepancies. A
// position is revisited only with more discrepancies left than before. If an
// iteration never had to skip a move for lack of discrepancies, it explored
// everything: the game is lost.
function lds(root, budget, cost) {
  for (let k = 0; ; k++) {
    const best = new Map([[root.key(), k]]);
    let skipped = false;
    const visit = (state, left) => {
      const moves = state.generateMoves();
      for (let i = 0; i < moves.length; i++) {
        const c = cost(i);
        if (c > left) {
          skipped = true;
          break; // later moves cost at least as much
        }
        budget.spend();
        const child = state.clone().apply(moves[i]);
        const key = child.key();
        const remaining = left - c;
        if (best.has(key) && best.get(key) >= remaining) continue;
        best.set(key, remaining);
        if (child.isWon() || visit(child, remaining)) return true;
      }
      return false;
    };
    if (visit(root, k)) return "winnable";
    if (!skipped) return "unwinnable";
  }
}
const flatCost = (i) => (i > 0 ? 1 : 0);
const rankCost = (i) => i;

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function luby(i) {
  // i-th term (1-based) of 1, 1, 2, 1, 1, 2, 4, 1, 1, 2, 1, 1, 2, 4, 8, …
  for (let k = 1; ; k++) {
    if (i === 2 ** k - 1) return 2 ** (k - 1);
    if (i < 2 ** k - 1) return luby(i - 2 ** (k - 1) + 1);
  }
}

// The first run uses the normal move order; later runs nudge each move's rank
// by up to 3 places at random.
function restarts(root, budget, runLimit) {
  for (let run = 0; ; run++) {
    const rnd = mulberry32(run * 7919 + 1);
    const order =
      run === 0
        ? (moves) => moves
        : (moves) =>
            moves
              .map((m, i) => ({ m, k: i + rnd() * 3 }))
              .sort((a, b) => a.k - b.k)
              .map((x) => x.m);
    // A run that finishes has explored every position, whatever its order.
    const result = dfs(root, budget, runLimit(run), order);
    if (result !== "cut") return result;
  }
}

const STRATEGIES = {
  dfs: (root, budget) => dfs(root, budget),
  lds: (root, budget) => lds(root, budget, flatCost),
  "lds-rank": (root, budget) => lds(root, budget, rankCost),
  "restarts-geo": (root, budget) => restarts(root, budget, (run) => 1000 * 2 ** run),
  "restarts-luby": (root, budget) => restarts(root, budget, (run) => 1000 * luby(run + 1)),
};
if (!STRATEGIES[strategy]) throw new Error("unknown strategy " + strategy);

function resolve(root) {
  if (root.isWon()) return { result: "winnable", at: 0 };
  const budget = new Budget(cap);
  try {
    return { result: STRATEGIES[strategy](root, budget), at: budget.tried };
  } catch (e) {
    if (e instanceof OutOfMoves) return { result: "unknown", at: null };
    throw e;
  }
}

const rows = [];
const started = Date.now();
mine.forEach((p, n) => {
  rows.push({ i: p.i, fresh: p.fresh, ...resolve(p.state) });
  if ((n + 1) % 100 === 0 || n + 1 === mine.length)
    console.log(`${strategy} shard ${shard}: ${n + 1}/${mine.length} positions, ${((Date.now() - started) / 1000).toFixed(0)}s`);
});
fs.writeFileSync(outFile, JSON.stringify({ variant: strategy, shard, cap, rows }));
