// "Find deal": deals new games until the solver finds one that can be won in
// fewer moves than the number typed into the menu bar, then puts it on the board.
//
// Each deal is checked with KlondikeSolver (same search and same move count as
// "Check": a "Draw ×n, then …" move counts as one move). The length
// used is the shortest win the solver found within its move limit, which is
// not necessarily the shortest possible win.

class DealGenerator {
  constructor(controller) {
    this.controller = controller;
    this.$status = $("#generate-status");
    this.running = false;

    $(document).on("click", ".solitr-generate", () => this.start());
    // Digits only (maxlength="3" in index.html caps it at 999).
    $(document).on("input", "#generate-max-moves", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });
    $(document).on("keydown", "#generate-max-moves", (e) => {
      if (e.key === "Enter") this.start();
    });
    this.$status.on("click", ".generate-stop", () => this.stop("Stopped."));
    $(document).on("click", ".solitr-new-game", () => {
      this.running = false;
      this.$status.hide();
    });
  }

  start() {
    if (this.running || this.controller.uiSuspended) return;
    const maxMoves = parseInt($("#generate-max-moves").val(), 10);
    if (!(maxMoves > 0)) {
      this.showStatus("Enter a number of moves first.", false);
      return;
    }
    if (!okToStartNewGame()) return;
    if (window.solverPanel) window.solverPanel.showPanel(false);
    $("#solver-banner").hide();

    this.running = true;
    this.maxMoves = maxMoves;
    this.deals = 0;
    this.step();
  }

  // One deal per step; setTimeout between deals keeps the page responsive.
  step() {
    if (!this.running) return;
    this.deals++;
    const model = new this.controller.constructor.ModelClass();
    model.deal();
    const solver = new KlondikeSolver(SolverState.fromModel(model)).run();
    const shortest = solver.winNode ? solver.winNode.depth : null;

    if (shortest !== null && shortest < this.maxMoves) {
      this.running = false;
      this.controller.startGame(model);
      this.showStatus(`Deal ${this.deals}: winnable in ${shortest} moves – it's on the board.`, false);
      return;
    }

    const why =
      shortest !== null
        ? `shortest win found is ${shortest} moves`
        : solver.result === "unwinnable"
          ? "not winnable"
          : `no win found within ${solver.maxMoves} tries`;
    this.showStatus(`Looking for a deal winnable in under ${this.maxMoves} moves… deal ${this.deals}: ${why}.`, true);
    setTimeout(() => this.step(), 0);
  }

  stop(message) {
    this.running = false;
    this.showStatus(`${message} Checked ${this.deals} deals.`, false);
  }

  showStatus(text, running) {
    this.$status.find(".generate-text").text(text);
    this.$status.find(".generate-stop").toggle(running);
    this.$status.show();
  }
}

$(() => {
  const init = () => (window.solitaireController ? (window.dealGenerator = new DealGenerator(window.solitaireController)) : setTimeout(init, 10));
  init();
});
