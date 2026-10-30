// Finds out whether the current position can be won, by trying moves.
//
// Depth-first search with an explicit stack (no recursion): each stack frame
// holds a position and the moves not yet tried from it. Every position gets a
// canonical key (SolverState.key); reaching a key seen before doesn't explore
// it again but records a *merge* edge to the existing node. That also stops
// loops (moving a card back and forth, cycling the stock).
//
// The search doesn't stop at the first win: it keeps going until every
// reachable position is explored or KlondikeSolver.MAX_MOVES moves have been
// tried, collecting every win on the way.
//
// The search takes shortcuts (see SolverState.generateMoves), so "unwinnable"
// is only reported after confirmUnwinnable has tried every legal move;
// otherwise the result is "unknown". A winnable game is never reported as
// unwinnable.
//
// Result graph:
//   nodes[i] = { id, parent, move, depth, state, status, children: [ids], merges: [{ move, to }] }
//   status:  "win"       a winning position
//            "path"      can reach a win (through its own moves or by merging
//                        into a position that can)
//            "dead"      every move from here was explored, none reaches a win
//            "stuck"     no legal moves at all
//            "open"      not finished when the search gave up

class KlondikeSolver {
  constructor(rootState, maxMoves = KlondikeSolver.MAX_MOVES) {
    this.maxMoves = maxMoves;
    this.movesTried = 0;
    this.nodes = [];
    this.seen = new Map(); // key -> node id
    this.result = null; // "winnable" | "unwinnable" | "unknown"
    this.winNodes = [];
    this.winNode = null; // the shortest win
    this.root = this.addNode(rootState, null, 0);
  }

  addNode(state, parent, move) {
    const node = {
      id: this.nodes.length,
      parent: parent ? parent.id : null,
      move,
      depth: parent ? parent.depth + 1 : 0,
      state,
      status: "open",
      children: [],
      merges: [],
    };
    this.nodes.push(node);
    this.seen.set(state.key(), node.id);
    if (parent) parent.children.push(node.id);
    return node;
  }

  run() {
    let gaveUp = false;
    if (this.root.state.isWon()) {
      this.markWin(this.root);
    } else {
      const stack = [{ node: this.root, moves: this.root.state.generateMoves(), next: 0 }];
      while (stack.length) {
        const frame = stack[stack.length - 1];

        if (frame.next >= frame.moves.length) {
          frame.node.status = frame.moves.length ? "dead" : "stuck";
          stack.pop();
          continue;
        }
        if (this.movesTried >= this.maxMoves) {
          gaveUp = true;
          break;
        }

        const move = frame.moves[frame.next++];
        this.movesTried++;
        const childState = frame.node.state.clone().apply(move);
        const seenId = this.seen.get(childState.key());
        if (seenId !== undefined) {
          frame.node.merges.push({ move, to: seenId });
          continue;
        }

        const child = this.addNode(childState, frame.node, move);
        if (childState.isWon()) this.markWin(child);
        else stack.push({ node: child, moves: childState.generateMoves(), next: 0 });
      }
    }

    this.markPositionsThatReachAWin();
    this.winNode = this.winNodes.reduce((best, n) => (!best || n.depth < best.depth ? n : best), null);
    this.result = this.winNodes.length ? "winnable" : gaveUp ? "unknown" : "unwinnable";
    if (this.result === "unwinnable" && !this.confirmUnwinnable()) {
      this.result = "unknown";
      this.unconfirmed = true;
    }
    return this;
  }

  // Exhaustive search over every legal move (SolverState.allSuccessors).
  // True only if every reachable position was visited and none is a win.
  confirmUnwinnable(maxPositions = KlondikeSolver.MAX_CONFIRM_POSITIONS) {
    const start = this.root.state;
    const seen = new Set([start.key()]);
    const stack = [start];
    while (stack.length) {
      const state = stack.pop();
      if (state.isWon()) return false;
      for (const next of state.allSuccessors()) {
        const key = next.key();
        if (seen.has(key)) continue;
        if (seen.size >= maxPositions) return false;
        seen.add(key);
        stack.push(next);
      }
    }
    return true;
  }

  markWin(node) {
    node.status = "win";
    this.winNodes.push(node);
  }

  // Walks backwards from every win over both kinds of edges (parent → child
  // and merges) and marks everything it reaches as "path".
  markPositionsThatReachAWin() {
    const predecessors = this.nodes.map(() => []);
    for (const node of this.nodes) {
      if (node.parent !== null) predecessors[node.id].push(node.parent);
      for (const merge of node.merges) predecessors[merge.to].push(node.id);
    }
    const queue = this.winNodes.map((n) => n.id);
    const reached = new Set(queue);
    while (queue.length) {
      for (const id of predecessors[queue.shift()]) {
        if (reached.has(id)) continue;
        reached.add(id);
        this.nodes[id].status = "path";
        queue.push(id);
      }
    }
  }

  parentOf(node) {
    return node.parent === null ? null : this.nodes[node.parent];
  }

  // Nodes from the root to `node`, inclusive.
  pathTo(node) {
    const path = [];
    for (let n = node; n; n = this.parentOf(n)) path.unshift(n);
    return path;
  }
}
// Total moves the search may try (including ones that lead to an already-seen position).
KlondikeSolver.MAX_MOVES = 1500;
// Positions confirmUnwinnable may visit before giving up (and reporting "unknown").
KlondikeSolver.MAX_CONFIRM_POSITIONS = 50000;
