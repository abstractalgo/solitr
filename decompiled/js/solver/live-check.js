// "Check every move" option: after every move (and undo, new deal, solver
// position shown on the board) checks whether the current position can still
// be won (WinCheck, js/solver/win-check.js) and shows the result next to the
// timer.
//
// The controller triggers "solitr-board-settled" on document whenever input
// resumes. The check runs in short slices between frames and is dropped when
// the next move comes in. Results are cached by position, so undoing back to a
// position doesn't search it again.

class LiveCheck {
  constructor(controller) {
    this.controller = controller;
    this.$status = $("#live-check");
    this.results = new Map(); // SolverState key -> { result, unconfirmed }
    this.pending = null; // timeout of the next slice

    $("#solitr-option-live-check")
      .prop("checked", window.store.get("solitr-option-live-check"))
      .change() // let bootstrap-toggle redraw
      .change(() => {
        window.store.set("solitr-option-live-check", this.enabled());
        this.update();
      });
    $(document).on("solitr-board-settled", () => this.update());
    this.update();
  }

  enabled() {
    return Boolean($("#solitr-option-live-check").prop("checked"));
  }

  update() {
    clearTimeout(this.pending);
    const model = this.controller.model;
    if (!this.enabled() || !model || model.finishedAt) {
      this.$status.removeClass("visible");
      return;
    }
    const state = SolverState.fromModel(model);
    const key = state.key();
    if (this.results.has(key)) return this.show(this.results.get(key));
    if (this.reachesKnownWin(state)) return this.show({ result: "winnable" });

    const check = new WinCheck(state);
    const slice = () => {
      const end = performance.now() + LiveCheck.SLICE_MS;
      while (!check.step(200) && performance.now() < end);
      if (check.result === null) {
        // Not answered within the first slice: show "Winnable?" until it is.
        this.show({ result: "unknown", pending: true });
        this.pending = setTimeout(slice, 0);
        return;
      }
      this.results.set(key, { result: check.result, unconfirmed: check.unconfirmed });
      if (check.result === "winnable") {
        for (const position of check.winningPositions()) this.results.set(position.key(), { result: "winnable" });
      }
      this.show(this.results.get(key));
    };
    // Deferred so the search doesn't hold up the animation that just started.
    this.pending = setTimeout(slice, 0);
  }

  // Turning the stock is always allowed, so if only turning it leads to a
  // position already known to be winnable, this one is winnable too. (Without
  // this, turning the stock could flip the answer between "Winnable" and
  // "Winnable?" just because the search got further from one than the other.)
  reachesKnownWin(state) {
    const s = state.clone();
    for (let recycles = 0; recycles < 2 && (s.stock.length || s.waste.length); ) {
      if (SolverState.stockStep(s.stock, s.waste, s.cardsToTurn) === "turnOverWaste") recycles++;
      const known = this.results.get(s.key());
      if (known && known.result === "winnable") return true;
    }
    return false;
  }

  show({ result, unconfirmed, pending }) {
    let text, cls, title;
    if (result === "winnable") {
      text = "Winnable";
      cls = "solver-yes";
      title = "A win was found from this position.";
    } else if (result === "unwinnable") {
      text = "Not winnable";
      cls = "solver-no";
      title = "Every possible sequence of moves was tried, none wins. Undo to get back to a winnable position.";
    } else {
      text = "Winnable?";
      cls = "solver-unknown";
      title = pending
        ? "Still checking this position."
        : unconfirmed
          ? "No win found, but not every possible move could be checked."
          : `No win found within ${WinCheck.MAX_MOVES} moves, and not every possible move could be checked.`;
    }
    // Only touch the DOM when the answer changes, so nothing flickers.
    const className = "solitr-live-check visible " + cls;
    if (this.$status.attr("class") !== className) this.$status.attr("class", className).text(text);
    this.$status.attr("title", title);
  }
}

// Longest stretch (ms) the check runs before letting the page draw a frame.
LiveCheck.SLICE_MS = 12;

$(() => {
  // setupGame creates window.solitaireController in its own $(); wait for it.
  const init = () => (window.solitaireController ? (window.liveCheck = new LiveCheck(window.solitaireController)) : setTimeout(init, 10));
  init();
});
