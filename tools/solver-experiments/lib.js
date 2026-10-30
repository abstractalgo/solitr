// Shared setup for the solver experiments: loads the game's model and solver
// code (decompiled/js) into a VM whose Math.random is seeded, so every run and
// every CI job deals exactly the same games.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS = path.join(__dirname, "../../decompiled/js/");

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns the VM context with KlondikeTurnThreeModel, SolverState, KlondikeSolver, ...
function loadGame(seed, extraSource = "") {
  const seededMath = Object.create(Math);
  seededMath.random = mulberry32(seed);
  const ctx = { window: {}, console, Math: seededMath };
  vm.createContext(ctx);
  for (const f of ["util.js", "cards.js", "command.js", "models/solitaire-base-model.js", "models/klondike-model.js", "solver/solver-state.js", "solver/solver.js"]) {
    vm.runInContext(fs.readFileSync(JS + f, "utf8"), ctx, { filename: f });
  }
  vm.runInContext(extraSource + "\nthis.game = { KlondikeTurnThreeModel, SolverState, KlondikeSolver };", ctx);
  return ctx.game;
}

// Every position one legal move away (used for the random walks).
function successors(state) {
  return state.allSuccessors();
}

// Test set: `deals` fresh Turn 3 deals, plus the positions after 10, 20, ... 60
// random legal moves from each.
function testPositions(game, deals, seed) {
  const rnd = mulberry32(seed + 1);
  const out = [];
  for (let d = 0; d < deals; d++) {
    const model = new game.KlondikeTurnThreeModel();
    model.deal();
    let state = game.SolverState.fromModel(model);
    for (let step = 0; step <= 60; step++) {
      if (step % 10 === 0) out.push({ state: state.clone(), fresh: step === 0 });
      const next = successors(state);
      if (!next.length) break;
      state = next[Math.floor(rnd() * next.length)];
    }
  }
  return out;
}

module.exports = { loadGame, testPositions };
