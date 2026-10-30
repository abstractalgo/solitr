// Yes/no winnability check that can run in slices (used by "Check every
// move", js/solver/live-check.js), so a big search doesn't freeze the page.
//
// Same depth-first search and move order as KlondikeSolver, but it keeps no
// graph and stops at the first win. "unwinnable" is only reported after the
// exhaustive confirmation over every legal move (SolverState.allSuccessors),
// as in KlondikeSolver.run; if either phase runs out of budget the result is
// "unknown".
//
//   const check = new WinCheck(state);
//   while (!check.step(1000)); // or one step per setTimeout
//   check.result // "winnable" | "unwinnable" | "unknown"

class WinCheck {
  constructor(rootState, maxMoves = WinCheck.MAX_MOVES, maxConfirmPositions = KlondikeSolver.MAX_CONFIRM_POSITIONS) {
    this.root = rootState;
    this.maxMoves = maxMoves;
    this.maxConfirmPositions = maxConfirmPositions;
    this.movesTried = 0;
    this.result = null;
    this.unconfirmed = false; // "unknown" because the confirmation ran out of budget
    if (rootState.isWon()) {
      this.result = "winnable";
      return;
    }
    this.phase = "search";
    this.seen = new Set([rootState.key()]);
    this.stack = [{ state: rootState, moves: rootState.generateMoves(), next: 0 }];
  }

  // Does up to `work` moves (search) or positions (confirmation). Returns true when finished.
  step(work) {
    for (let done = 0; this.result === null && done < work; done++) {
      if (this.phase === "search") this.searchStep();
      else this.confirmStep();
    }
    return this.result !== null;
  }

  searchStep() {
    const frame = this.stack[this.stack.length - 1];
    if (!frame) {
      // Every position explored without a win: confirm without shortcuts.
      this.phase = "confirm";
      this.seen = new Set([this.root.key()]);
      this.stack = [this.root];
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
      this.winningLine = [...this.stack.map((f) => f.state), state];
    } else this.stack.push({ state, moves: state.generateMoves(), next: 0 });
  }

  // Every position on the winning line that was found, including the ones in
  // between the stock turns of a "draw ×n, then …" move. All of them can be won.
  winningPositions() {
    if (!this.winningLine) return [this.root];
    const positions = [];
    this.winningLine.forEach((state, i) => {
      positions.push(state);
      const frame = this.stack[i];
      if (!frame || i === this.winningLine.length - 1) return;
      const turns = moveTurns(frame.moves[frame.next - 1]);
      for (let t = 1; t <= turns; t++) positions.push(state.clone().applyStockSteps(t));
    });
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
// Moves the search may try before giving up ("unknown").
WinCheck.MAX_MOVES = 500000;
