// Yes/no winnability check that can run in slices (used by "Check every
// move", js/solver/live-check.js), so a big search doesn't freeze the page.
//
// Two searches over the same moves (SolverState.generateMoves) take turns,
// each with half of the move budget, and the first answer wins:
//   - DepthFirstSearch: KlondikeSolver's search without the graph. Best at
//     proving a game lost.
//   - DiscrepancySearch: limited discrepancy search. Finds wins much sooner
//     when depth-first gets stuck under an early bad choice.
// Together they leave about a quarter fewer positions unanswered than
// depth-first alone (tools/solver-experiments, strategies.js: "lds-rank"
// paired with "dfs").
//
// "unwinnable" is only reported after the exhaustive confirmation over every
// legal move (SolverState.allSuccessors), as in KlondikeSolver.run; if
// everything runs out of budget the result is "unknown".
//
//   const check = new WinCheck(state);
//   while (!check.step(1000)); // or one step per setTimeout
//   check.result // "winnable" | "unwinnable" | "unknown"

class WinCheck {
  constructor(rootState, maxMoves = WinCheck.MAX_MOVES, maxConfirmPositions = KlondikeSolver.MAX_CONFIRM_POSITIONS) {
    this.root = rootState;
    this.maxConfirmPositions = maxConfirmPositions;
    this.result = null;
    this.unconfirmed = false; // "unknown" because the confirmation ran out of budget
    if (rootState.isWon()) {
      this.result = "winnable";
      return;
    }
    this.phase = "search";
    this.searches = [new DepthFirstSearch(rootState, maxMoves / 2), new DiscrepancySearch(rootState, maxMoves / 2)];
    this.turn = 0;
  }

  // Does up to `work` moves (search) or positions (confirmation). Returns true when finished.
  step(work) {
    for (let done = 0; this.result === null && done < work; done++) {
      if (this.phase === "search") this.searchStep();
      else this.confirmStep();
    }
    return this.result !== null;
  }

  // One step of each search in turn; a search that ran out of moves drops out.
  searchStep() {
    this.searches = this.searches.filter((s) => s.result !== "unknown");
    if (!this.searches.length) {
      this.result = "unknown";
      return;
    }
    const search = this.searches[this.turn++ % this.searches.length];
    search.step();
    if (search.result === "winnable") {
      this.result = "winnable";
      this.winningLine = search.winningLine;
    } else if (search.result === "unwinnable") {
      // Every position explored without a win: confirm without shortcuts.
      this.phase = "confirm";
      this.seen = new Set([this.root.key()]);
      this.stack = [this.root];
    }
  }

  // Every position on the winning line that was found, including the ones in
  // between the stock turns of a "draw ×n, then …" move. All of them can be won.
  winningPositions() {
    if (!this.winningLine) return [this.root];
    const positions = [];
    for (const { state, move } of this.winningLine) {
      positions.push(state);
      if (move === undefined) continue;
      for (let t = 1; t <= moveTurns(move); t++) positions.push(state.clone().applyStockSteps(t));
    }
    return positions;
  }

  confirmStep() {
    const state = this.stack.pop();
    if (!state) {
      this.result = "unwinnable";
      return;
    }
    if (state.isWon()) {
      // A win the shortcuts in generateMoves missed.
      this.result = "winnable";
      return;
    }
    for (const next of state.allSuccessors()) {
      const key = next.key();
      if (this.seen.has(key)) continue;
      if (this.seen.size >= this.maxConfirmPositions) {
        this.result = "unknown";
        this.unconfirmed = true;
        return;
      }
      this.seen.add(key);
      this.stack.push(next);
    }
  }
}
// Moves the searches may try before giving up ("unknown"), shared between the two.
WinCheck.MAX_MOVES = 500000;

// The positions from the root to `last`, each with the move played from it.
function winningLineOf(stack, last) {
  return [...stack.map((f) => ({ state: f.state, move: f.moves[f.next - 1] })), { state: last }];
}

// Depth-first, stops at the first win. Each step() tries one move (or backtracks);
// `result` becomes "winnable", "unwinnable" (every position explored) or
// "unknown" (out of moves).
class DepthFirstSearch {
  constructor(root, maxMoves) {
    this.maxMoves = maxMoves;
    this.movesTried = 0;
    this.result = null;
    this.seen = new Set([root.key()]);
    this.stack = [{ state: root, moves: root.generateMoves(), next: 0 }];
  }

  step() {
    const frame = this.stack[this.stack.length - 1];
    if (!frame) {
      this.result = "unwinnable";
      return;
    }
    if (frame.next >= frame.moves.length) {
      this.stack.pop();
      return;
    }
    if (this.movesTried >= this.maxMoves) {
      this.result = "unknown";
      return;
    }
    this.movesTried++;
    const state = frame.state.clone().apply(frame.moves[frame.next++]);
    const key = state.key();
    if (this.seen.has(key)) return;
    this.seen.add(key);
    if (state.isWon()) {
      this.result = "winnable";
      this.winningLine = winningLineOf(this.stack, state);
    } else this.stack.push({ state, moves: state.generateMoves(), next: 0 });
  }
}

// Limited discrepancy search: the moves at each position are tried in
// generateMoves' order, and taking the i-th one (counting from 0) costs i
// "discrepancies". Pass k explores every line costing at most k in total, so
// the preferred line comes first, then lines that stray from it a little, and
// so on. A position is searched again only with more discrepancies left than
// before. A pass that never had to skip a move has explored everything: the
// game is lost. Same step() / result as DepthFirstSearch.
class DiscrepancySearch {
  constructor(root, maxMoves) {
    this.root = root;
    this.maxMoves = maxMoves;
    this.movesTried = 0;
    this.result = null;
    this.limit = -1;
    this.nextPass();
  }

  nextPass() {
    this.limit++;
    this.skipped = false;
    this.best = new Map([[this.root.key(), this.limit]]); // key -> most discrepancies left when searched
    this.stack = [{ state: this.root, moves: this.root.generateMoves(), next: 0, left: this.limit }];
  }

  step() {
    const frame = this.stack[this.stack.length - 1];
    if (!frame) {
      if (this.skipped) this.nextPass();
      else this.result = "unwinnable";
      return;
    }
    if (frame.next >= frame.moves.length) {
      this.stack.pop();
      return;
    }
    const cost = frame.next;
    if (cost > frame.left) {
      // This move and the ones after it cost too much in this pass.
      this.skipped = true;
      this.stack.pop();
      return;
    }
    if (this.movesTried >= this.maxMoves) {
      this.result = "unknown";
      return;
    }
    this.movesTried++;
    const state = frame.state.clone().apply(frame.moves[frame.next++]);
    const key = state.key();
    const left = frame.left - cost;
    if (this.best.has(key) && this.best.get(key) >= left) return;
    this.best.set(key, left);
    if (state.isWon()) {
      this.result = "winnable";
      this.winningLine = winningLineOf(this.stack, state);
    } else this.stack.push({ state, moves: state.generateMoves(), next: 0, left });
  }
}
