// "Check Winnable" button and the solver panel: result summary, graph of the
// explored positions, and an inspector for the selected position.
//
// Graph: one dot per position, laid out left to right by number of moves from
// the start. Solid lines are moves to new positions; dashed lines are moves
// that led to a position already seen (merges). Colours: see the legend in
// index.html / css/solver.css.

class SolverPanel {
  constructor(controller) {
    this.controller = controller;
    this.$panel = $("#solver-panel");
    this.$banner = $("#solver-banner");
    this.solver = null;
    this.rootDump = null; // the game as it was when "Check Winnable" was pressed
    this.selected = null;

    $(document).on("click", ".solitr-check-winnable", () => this.open());
    this.$panel.on("click", ".solver-close", () => this.showPanel(false));
    this.$panel.on("click", ".solver-autoplay", () =>
      this.autoplayWin(this.selected && this.selected.status === "win" ? this.selected : this.solver.winNode),
    );
    this.$panel.on("click", ".solver-show-on-board", () => this.showOnBoard(this.selected));
    this.$panel.on("click", "[data-node]", (e) => this.select(this.solver.nodes[+$(e.currentTarget).attr("data-node")]));
    this.$banner.on("click", ".solver-back", () => this.showPanel(true));
    this.$banner.on("click", ".solver-restore", () => this.restoreGame());
    $(document).on("click", ".solitr-new-game", () => {
      this.$banner.hide();
      this.showPanel(false);
    });
  }

  open() {
    if (this.controller.uiSuspended) return;
    const model = this.controller.model;
    this.rootDump = JSON.stringify(model.dumpHash());
    this.solver = new KlondikeSolver(SolverState.fromModel(model)).run();
    this.$banner.hide();
    this.renderSummary();
    this.renderGraph();
    this.select(this.solver.winNode || this.solver.root);
    this.showPanel(true);
  }

  // The panel takes the board's place on the page (the board is hidden, not
  // covered), and the board comes back when the panel closes.
  showPanel(show) {
    this.$panel.toggleClass("open", show);
    $("#solitaireCanvas").toggle(!show);
  }

  renderSummary() {
    const s = this.solver;
    let text;
    if (s.result === "winnable")
      text = `<b class="solver-yes">Winnable</b> – ${s.winNodes.length} win${s.winNodes.length > 1 ? "s" : ""} found, shortest ${s.winNode.depth} moves.`;
    else if (s.result === "unwinnable") text = `<b class="solver-no">Not winnable</b> – every reachable position was explored.`;
    else text = `<b class="solver-unknown">Unknown</b> – gave up after trying ${s.maxMoves} moves.`;
    this.$panel.find(".solver-summary").html(
      `${text} <span class="solver-stats">${s.nodes.length} positions, ${s.movesTried} moves tried.</span>`,
    );
    this.$panel.find(".solver-autoplay").toggle(s.result === "winnable");
    const wins = s.winNodes
      .slice()
      .sort((a, b) => a.depth - b.depth)
      .map((n) => `<a class="solver-win-chip" data-node="${n.id}">#${n.id} · ${n.depth} moves</a>`);
    this.$panel.find(".solver-wins").html(wins.length ? "<h5>Wins found</h5>" + wins.join("") : "");
  }

  // ---- Graph --------------------------------------------------------------------

  renderGraph() {
    const nodes = this.solver.nodes;
    const COL = 28, ROW = 20, MARGIN = 16;

    // Place nodes in depth-first order, the winning branch first so it forms the
    // top line. Each node goes in its depth's column, on the first free row at
    // or below its parent's row.
    const order = (node) =>
      node.children.slice().sort((a, b) => (nodes[a].status === "path" || nodes[a].status === "win" ? -1 : 0) - (nodes[b].status === "path" || nodes[b].status === "win" ? -1 : 0));
    const nextFreeRow = [];
    const row = new Array(nodes.length);
    const stack = [this.solver.root.id];
    while (stack.length) {
      const node = nodes[stack.pop()];
      const parentRow = node.parent === null ? 0 : row[node.parent];
      row[node.id] = Math.max(parentRow, nextFreeRow[node.depth] || 0);
      nextFreeRow[node.depth] = row[node.id] + 1;
      stack.push(...order(node).reverse());
    }
    const x = (n) => MARGIN + n.depth * COL;
    const y = (n) => MARGIN + row[n.id] * ROW;

    const width = MARGIN * 2 + (Math.max(...nodes.map((n) => n.depth)) + 1) * COL;
    const height = MARGIN * 2 + Math.max(...row) * ROW + ROW;
    const parts = [];
    for (const node of nodes) {
      for (const merge of node.merges) {
        const to = nodes[merge.to];
        parts.push(
          `<path class="solver-merge${to.status === "path" || to.status === "win" ? " solver-merge-win" : ""}" data-from="${node.id}" d="M${x(node)},${y(node)} C${x(node) + COL},${y(node)} ${x(to) - COL},${y(to)} ${x(to)},${y(to)}"><title>${this.escape(node.state.describe(merge.move))} → merges into #${to.id}</title></path>`,
        );
      }
    }
    for (const node of nodes) {
      if (node.parent === null) continue;
      const parent = nodes[node.parent];
      parts.push(`<path class="solver-edge solver-edge-${node.status}" d="M${x(parent)},${y(parent)} L${x(parent) + COL / 2},${y(node)} L${x(node)},${y(node)}"/>`);
    }
    for (const node of nodes) {
      const label = node.parent === null ? "Start" : this.escape(nodes[node.parent].state.describe(node.move));
      parts.push(
        `<circle class="solver-node solver-${node.status}${node.parent === null ? " solver-root" : ""}" data-node="${node.id}" cx="${x(node)}" cy="${y(node)}" r="${node.status === "win" || node.parent === null ? 7 : 5}"><title>#${node.id}: ${label} (${node.status})</title></circle>`,
      );
    }
    this.$panel.find(".solver-graph").html(`<svg width="${width}" height="${height}">${parts.join("")}</svg>`);
  }

  // ---- Inspector ------------------------------------------------------------------

  select(node) {
    if (!node) return;
    this.selected = node;
    const nodes = this.solver.nodes;
    this.$panel.find(".solver-node").removeClass("selected");
    const $circle = this.$panel.find(`circle[data-node="${node.id}"]`).addClass("selected");
    this.$panel.find(".solver-merge").removeClass("selected");
    this.$panel.find(`.solver-merge[data-from="${node.id}"]`).addClass("selected");
    if ($circle.length) $circle[0].scrollIntoView({ block: "nearest", inline: "nearest" });

    const statusText = {
      win: "winning position",
      path: "can reach a win",
      dead: "dead end – nothing from here leads to a win",
      stuck: "stuck – no legal moves",
      open: "not fully explored",
    }[node.status];
    const path = this.solver.pathTo(node);
    const pathItems = path
      .slice(1)
      .map((n, i) => `<li data-node="${n.id}" class="${n.id === node.id ? "current" : ""}">${this.escape(path[i].state.describe(n.move))}</li>`)
      .join("");
    const nextItems = [
      ...node.children.map((id) => `<li data-node="${id}" class="solver-li-${nodes[id].status}">${this.escape(node.state.describe(nodes[id].move))}</li>`),
      ...node.merges.map((m) => `<li data-node="${m.to}" class="solver-li-merge">${this.escape(node.state.describe(m.move))} <i>→ same as #${m.to}</i></li>`),
    ].join("");

    this.$panel.find(".solver-inspector-title").html(`Position #${node.id} · ${node.depth} moves from start · ${statusText}`);
    this.$panel.find(".solver-board").html(this.renderBoard(node.state));
    this.$panel.find(".solver-stock").text(
      node.state.stock.length ? "Stock (next card first): " + node.state.stock.slice().reverse().map(solverCardName).join(" ") : "Stock: empty",
    );
    this.$panel.find(".solver-moves-path").html(pathItems || "<li><i>(start position)</i></li>");
    this.$panel.find(".solver-moves-next").html(nextItems || "<li><i>none</i></li>");
    this.$panel.find(".solver-win-chip").removeClass("current");
    this.$panel.find(`.solver-win-chip[data-node="${node.id}"]`).addClass("current");
    this.$panel.find(".solver-autoplay").text(node.status === "win" ? `Autoplay win #${node.id}` : "Autoplay shortest win");
  }

  // Miniature board using the game's own geometry and card images.
  // Face-down cards are shown dimmed (the solver knows every card).
  renderBoard(state) {
    const c = this.controller;
    const html = [];
    const card = (cardInt, pos, extra = "") => {
      const cls = "card" + "a23456789tjqk"[solverCardRank(cardInt)] + "cdhs"[solverCardSuit(cardInt)];
      html.push(`<div class="solver-card ${cls} ${extra}" style="left:${pos.left}px;top:${pos.top}px"></div>`);
    };
    const base = (pos) => html.push(`<div class="solver-card solver-base" style="left:${pos.left}px;top:${pos.top}px"></div>`);

    base(c.stockPosition);
    if (state.stock.length) {
      html.push(`<div class="solver-card cardback" style="left:${c.stockPosition.left}px;top:${c.stockPosition.top}px"></div>`);
      html.push(`<div class="solver-count" style="left:${c.stockPosition.left}px;top:${c.stockPosition.top}px">${state.stock.length}</div>`);
    }
    state.waste.forEach((w, i) => {
      const fan = Math.max(i + Math.min(state.waste.length, state.cardsToTurn) - state.waste.length, 0);
      card(w, { left: c.wastePosition.left + fan * c.wasteFanningOffset, top: c.wastePosition.top });
    });
    c.foundationPositions.forEach((pos, i) => {
      base(pos);
      if (state.fHeight[i]) card((state.fHeight[i] - 1) * 4 + state.fSuit[i], pos);
    });
    let bottom = 0;
    c.tableauPilePositions.forEach((pos0, i) => {
      base(pos0);
      const pos = { ...pos0 };
      for (const d of state.down[i]) {
        card(d, pos, "solver-facedown");
        pos.top += c.faceDownTableauFanningOffset;
      }
      for (const u of state.up[i]) {
        card(u, pos);
        pos.top += c.faceUpTableauFanningOffset;
      }
      bottom = Math.max(bottom, pos.top + c.cardDimensions.height);
    });
    const width = c.gameWidth + c.padding.left;
    return (
      `<div style="width:${width / 2}px;height:${bottom / 2}px">` +
      `<div class="solver-board-inner" style="width:${width}px;height:${bottom}px">${html.join("")}</div></div>`
    );
  }

  // ---- Playing positions on the real board ---------------------------------------

  // Puts the game into the selected position (undo still works move by move).
  showOnBoard(node) {
    const c = this.controller;
    c.load(this.rootDump);
    const path = this.solver.pathTo(node);
    for (let i = 1; i < path.length; i++) {
      for (const cmd of path[i - 1].state.toCommands(path[i].move)) {
        c.model.executeCommand(new SolitaireCommand(cmd));
        for (let flip; (flip = c.model.autoFlipCommand()); ) c.model.executeCommand(flip);
      }
    }
    c.renderAfterCommand(null);
    this.showPanel(false);
    this.$banner.find(".solver-banner-text").text(`Showing solver position #${node.id}.`);
    this.$banner.show();
  }

  restoreGame() {
    this.controller.load(this.rootDump);
    this.$banner.hide();
  }

  // Replays a winning line on the board with the normal animations.
  autoplayWin(winNode) {
    const c = this.controller;
    const path = this.solver.pathTo(winNode);
    c.load(this.rootDump);
    this.showPanel(false);
    this.$banner.hide();
    const commands = [];
    for (let i = 1; i < path.length; i++) commands.push(...path[i - 1].state.toCommands(path[i].move));
    const step = () => {
      if (c.uiSuspended || $(".card:animated").length) return setTimeout(step, 50);
      if (!commands.length) return;
      c.processUserCommand(new SolitaireCommand(commands.shift()));
      setTimeout(step, 50);
    };
    step();
  }

  escape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

$(() => {
  // setupGame creates window.solitaireController in its own $(); wait for it.
  const init = () => (window.solitaireController ? (window.solverPanel = new SolverPanel(window.solitaireController)) : setTimeout(init, 10));
  init();
});
