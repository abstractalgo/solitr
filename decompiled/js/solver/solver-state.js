// Compact Klondike position used by the solver, independent of the UI model.
//
// Cards are ints: rank * 4 + suit (rank 0 = Ace ... 12 = King; suit 0..3 =
// C, D, H, S, same order as solitaireSuits). Piles are arrays, top card last,
// exactly mirroring KlondikeModel so solver moves translate 1:1 into
// SolitaireCommands:
//
//   down[i], up[i]   face-down / face-up part of tableau column i
//   stock, waste     top card last (turning pops stock, pushes waste)
//   fSuit[s], fHeight[s]   foundation slot s: suit (-1 = empty) and number of cards
//
// The solver has full knowledge of the deal ("thoughtful solitaire").

const SOLVER_SUIT_SYMBOLS = ["♣", "♦", "♥", "♠"];

function solverCardRank(card) {
  return card >> 2;
}
function solverCardSuit(card) {
  return card & 3;
}
function solverCardIsRed(card) {
  const suit = card & 3;
  return suit === 1 || suit === 2;
}
function solverCardName(card) {
  return "A23456789TJQK"[card >> 2].replace("T", "10") + SOLVER_SUIT_SYMBOLS[card & 3];
}

// ---- Moves ----------------------------------------------------------------------
// A move is packed into one int: type | from << 4 | to << 8 | count << 12 | turns << 18.
//
// Stock turns are not separate moves (turning alone never changes anything
// lasting). Instead every waste card that some number of stock turns would
// bring to the top is directly playable, and `turns` records how many stock
// actions (turn stock / turn waste over) come first. This is the "K+"
// representation from Bjarnason, Fern & Tadepalli, "Searching Solitaire in Real
// Time" (2007); it loses nothing because tableau moves never touch the stock.

const MOVE = {
  TABLEAU_TO_FOUNDATION: 1, // from = column, to = foundation slot
  WASTE_TO_FOUNDATION: 2, // to = foundation slot
  WASTE_TO_TABLEAU: 3, // to = column
  TABLEAU_TO_TABLEAU: 4, // from, to = columns, count = cards moved
  FOUNDATION_TO_TABLEAU: 5, // from = foundation slot, to = column
};

function packMove(type, from = 0, to = 0, count = 1, turns = 0) {
  return type | (from << 4) | (to << 8) | (count << 12) | (turns << 18);
}
function moveType(m) {
  return m & 15;
}
function moveFrom(m) {
  return (m >> 4) & 15;
}
function moveTo(m) {
  return (m >> 8) & 15;
}
function moveCount(m) {
  return (m >> 12) & 63;
}
function moveTurns(m) {
  return (m >> 18) & 63;
}

class SolverState {
  constructor(cardsToTurn) {
    this.cardsToTurn = cardsToTurn;
    this.down = [];
    this.up = [];
    this.stock = [];
    this.waste = [];
    this.fSuit = [-1, -1, -1, -1];
    this.fHeight = [0, 0, 0, 0];
  }

  static fromModel(model) {
    const toInt = (card) => card.rank.value * 4 + card.suit.value;
    const s = new SolverState(model.constructor.cardsToTurn);
    s.down = model.faceDownTableauPiles.map((p) => p.map(toInt));
    s.up = model.faceUpTableauPiles.map((p) => p.map(toInt));
    s.stock = model.stock.map(toInt);
    s.waste = model.waste.map(toInt);
    model.foundations.forEach((pile, i) => {
      s.fSuit[i] = pile.length ? pile[0].suit.value : -1;
      s.fHeight[i] = pile.length;
    });
    return s;
  }

  clone() {
    const s = new SolverState(this.cardsToTurn);
    s.down = this.down.map((p) => p.slice());
    s.up = this.up.map((p) => p.slice());
    s.stock = this.stock.slice();
    s.waste = this.waste.slice();
    s.fSuit = this.fSuit.slice();
    s.fHeight = this.fHeight.slice();
    return s;
  }

  // Same condition as KlondikeModel.nextAutoCommand's "isObviouslyWon": from
  // here the game finishes itself.
  isWon() {
    if (this.stock.length > 0 || this.waste.length > 1) return false;
    for (const pile of this.down) if (pile.length > 0) return false;
    return true;
  }

  // Canonical key: positions that differ only in tableau column order or
  // foundation slot order are the same position (they "merge").
  key() {
    const heights = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) if (this.fSuit[i] >= 0) heights[this.fSuit[i]] = this.fHeight[i];
    const columns = [];
    for (let i = 0; i < this.up.length; i++) {
      columns.push(String.fromCharCode(...this.down[i].map((c) => c + 48)) + "|" + String.fromCharCode(...this.up[i].map((c) => c + 48)));
    }
    columns.sort();
    return (
      heights.join(",") + "/" + columns.join("/") + "/" +
      String.fromCharCode(...this.stock.map((c) => c + 48)) + "/" +
      String.fromCharCode(...this.waste.map((c) => c + 48))
    );
  }

  foundationSlotFor(card) {
    const suit = solverCardSuit(card);
    for (let i = 0; i < 4; i++) if (this.fSuit[i] === suit) return this.fHeight[i] === solverCardRank(card) ? i : -1;
    if (solverCardRank(card) !== 0) return -1;
    return this.fSuit.indexOf(-1);
  }

  heightOfSuit(suit) {
    const slot = this.fSuit.indexOf(suit);
    return slot >= 0 ? this.fHeight[slot] : 0;
  }

  // Can `card` start a run placed on column `col`? (KlondikeModel.accepts)
  tableauAccepts(col, card) {
    const up = this.up[col];
    if (up.length === 0) return this.down[col].length === 0 && solverCardRank(card) === 12;
    const top = up[up.length - 1];
    return solverCardRank(top) - 1 === solverCardRank(card) && solverCardIsRed(top) !== solverCardIsRed(card);
  }

  // A tableau card that can never be needed on the tableau again: Aces, 2s, and
  // cards whose two opposite-colour cards one rank lower are already on the
  // foundations. Playing it is never wrong, so it is played without branching.
  isSafeToFoundation(card) {
    const rank = solverCardRank(card);
    if (rank <= 1) return true;
    const red = solverCardIsRed(card);
    const opposite = red ? [0, 3] : [1, 2];
    return this.heightOfSuit(opposite[0]) >= rank && this.heightOfSuit(opposite[1]) >= rank;
  }

  // Legal moves, most promising first (the search tries them in this order).
  // Returns [safeMove] alone when a safe foundation move exists.
  generateMoves() {
    const n = this.up.length;
    for (let i = 0; i < n; i++) {
      const up = this.up[i];
      if (!up.length) continue;
      const card = up[up.length - 1];
      const slot = this.foundationSlotFor(card);
      if (slot >= 0 && this.isSafeToFoundation(card)) return [packMove(MOVE.TABLEAU_TO_FOUNDATION, i, slot)];
    }

    const toFoundation = [], uncovering = [], fromWaste = [], otherTableau = [], fromStock = [], fromFoundation = [];
    let firstEmpty = -1;
    for (let j = 0; j < n; j++) if (!this.up[j].length && !this.down[j].length) { firstEmpty = j; break; }
    // Empty columns are interchangeable: only ever move into the first one.
    const targetOk = (j) => this.up[j].length || this.down[j].length || j === firstEmpty;

    for (let i = 0; i < n; i++) {
      const up = this.up[i];
      if (!up.length) continue;
      const slot = this.foundationSlotFor(up[up.length - 1]);
      if (slot >= 0) toFoundation.push(packMove(MOVE.TABLEAU_TO_FOUNDATION, i, slot));
      for (let k = 0; k < up.length; k++) {
        for (let j = 0; j < n; j++) {
          if (j === i || !targetOk(j) || !this.tableauAccepts(j, up[k])) continue;
          // Moving a whole column that has nothing underneath into an empty column changes nothing.
          if (k === 0 && !this.down[i].length && !this.up[j].length) continue;
          // Moving part of a run only helps if the card it uncovers can go to a
          // foundation (dominance from Blake & Gent, "The Winnability of Klondike").
          if (k > 0 && this.foundationSlotFor(up[k - 1]) < 0) continue;
          const m = packMove(MOVE.TABLEAU_TO_TABLEAU, i, j, up.length - k);
          if (k === 0 && this.down[i].length) uncovering.push(m);
          else otherTableau.push(m);
        }
      }
    }

    for (const { card, turns } of this.reachableWasteCards()) {
      const slot = this.foundationSlotFor(card);
      if (slot >= 0) (turns ? fromStock : toFoundation).push(packMove(MOVE.WASTE_TO_FOUNDATION, 0, slot, 1, turns));
      for (let j = 0; j < n; j++) {
        if (targetOk(j) && this.tableauAccepts(j, card)) (turns ? fromStock : fromWaste).push(packMove(MOVE.WASTE_TO_TABLEAU, 0, j, 1, turns));
      }
    }

    // "Worrying back": taking a card off a foundation (rarely needed, tried last).
    for (let s = 0; s < 4; s++) {
      if (!this.fHeight[s]) continue;
      const card = (this.fHeight[s] - 1) * 4 + this.fSuit[s];
      for (let j = 0; j < n; j++) {
        if (this.up[j].length && this.tableauAccepts(j, card)) fromFoundation.push(packMove(MOVE.FOUNDATION_TO_TABLEAU, s, j));
      }
    }

    // Prefer uncovering columns with the most face-down cards.
    uncovering.sort((a, b) => this.down[moveFrom(b)].length - this.down[moveFrom(a)].length);
    return [...toFoundation, ...uncovering, ...fromWaste, ...otherTableau, ...fromStock, ...fromFoundation];
  }

  // One stock action, like clicking the stock: turn cards over, or turn the
  // waste back over when the stock is empty. Returns the game action name.
  static stockStep(stock, waste, cardsToTurn) {
    if (stock.length) {
      for (let i = 0; i < cardsToTurn && stock.length; i++) waste.push(stock.pop());
      return "turnStock";
    }
    while (waste.length) stock.push(waste.pop());
    return "turnOverWaste";
  }

  // Every card that can be brought to the top of the waste: [{ card, turns }],
  // fewest turns first. Simulates the rest of this pass through the stock plus
  // one full pass after turning the waste over; after that it only repeats.
  reachableWasteCards() {
    const result = [];
    if (this.waste.length) result.push({ card: this.waste[this.waste.length - 1], turns: 0 });
    if (!this.stock.length && !this.waste.length) return result;
    const stock = this.stock.slice(), waste = this.waste.slice();
    let recycles = 0;
    for (let turns = 1; ; turns++) {
      if (!stock.length && ++recycles === 2) break;
      SolverState.stockStep(stock, waste, this.cardsToTurn);
      if (waste.length) result.push({ card: waste[waste.length - 1], turns });
    }
    return result;
  }

  // Applies `m` in place, then turns over exposed face-down cards like the game does.
  apply(m) {
    const from = moveFrom(m), to = moveTo(m);
    for (let t = moveTurns(m); t > 0; t--) SolverState.stockStep(this.stock, this.waste, this.cardsToTurn);
    switch (moveType(m)) {
      case MOVE.TABLEAU_TO_FOUNDATION:
        this.pushFoundation(to, this.up[from].pop());
        break;
      case MOVE.WASTE_TO_FOUNDATION:
        this.pushFoundation(to, this.waste.pop());
        break;
      case MOVE.WASTE_TO_TABLEAU:
        this.up[to].push(this.waste.pop());
        break;
      case MOVE.TABLEAU_TO_TABLEAU:
        this.up[to].push(...this.up[from].splice(this.up[from].length - moveCount(m)));
        break;
      case MOVE.FOUNDATION_TO_TABLEAU:
        this.up[to].push((this.fHeight[from] - 1) * 4 + this.fSuit[from]);
        if (--this.fHeight[from] === 0) this.fSuit[from] = -1;
        break;
    }
    return this.flipExposed();
  }

  flipExposed() {
    for (let i = 0; i < this.up.length; i++) {
      if (!this.up[i].length && this.down[i].length) this.up[i].push(this.down[i].pop());
    }
    return this;
  }

  // Every position one legal move away, with none of generateMoves' shortcuts
  // (safe moves, run-splitting rule, stock turns folded into moves): one stock
  // action, the waste card to a foundation or column, a column's top card to a
  // foundation, any face-up run to any column, a foundation card to any column.
  // Used to confirm "unwinnable" (KlondikeSolver.confirmUnwinnable).
  allSuccessors() {
    const result = [];
    const n = this.up.length;
    if (this.stock.length || this.waste.length) {
      const s = this.clone();
      SolverState.stockStep(s.stock, s.waste, this.cardsToTurn);
      result.push(s);
    }
    if (this.waste.length) {
      const card = this.waste[this.waste.length - 1];
      const slot = this.foundationSlotFor(card);
      if (slot >= 0) {
        const s = this.clone();
        s.pushFoundation(slot, s.waste.pop());
        result.push(s);
      }
      for (let j = 0; j < n; j++) {
        if (!this.tableauAccepts(j, card)) continue;
        const s = this.clone();
        s.up[j].push(s.waste.pop());
        result.push(s);
      }
    }
    for (let i = 0; i < n; i++) {
      const up = this.up[i];
      if (!up.length) continue;
      const slot = this.foundationSlotFor(up[up.length - 1]);
      if (slot >= 0) {
        const s = this.clone();
        s.pushFoundation(slot, s.up[i].pop());
        result.push(s.flipExposed());
      }
      for (let k = 0; k < up.length; k++) {
        for (let j = 0; j < n; j++) {
          if (j === i || !this.tableauAccepts(j, up[k])) continue;
          const s = this.clone();
          s.up[j].push(...s.up[i].splice(k));
          result.push(s.flipExposed());
        }
      }
    }
    for (let slot = 0; slot < 4; slot++) {
      if (!this.fHeight[slot]) continue;
      const card = (this.fHeight[slot] - 1) * 4 + this.fSuit[slot];
      for (let j = 0; j < n; j++) {
        if (!this.tableauAccepts(j, card)) continue;
        const s = this.clone();
        s.up[j].push(card);
        if (--s.fHeight[slot] === 0) s.fSuit[slot] = -1;
        result.push(s);
      }
    }
    return result;
  }

  pushFoundation(slot, card) {
    this.fSuit[slot] = solverCardSuit(card);
    this.fHeight[slot]++;
  }

  // Human-readable description of `m` played from this (pre-move) position.
  describe(m) {
    const from = moveFrom(m), to = moveTo(m), turns = moveTurns(m);
    const top = (pile) => solverCardName(pile[pile.length - 1]);
    const drawn = turns ? `Draw ×${turns}, then ` : "";
    const waste = turns ? this.clone().applyStockSteps(turns).waste : this.waste;
    switch (moveType(m)) {
      case MOVE.TABLEAU_TO_FOUNDATION:
        return `${top(this.up[from])} column ${from + 1} → foundation`;
      case MOVE.WASTE_TO_FOUNDATION:
        return `${drawn}${top(waste)} waste → foundation`;
      case MOVE.WASTE_TO_TABLEAU:
        return `${drawn}${top(waste)} waste → column ${to + 1}`;
      case MOVE.TABLEAU_TO_TABLEAU: {
        const count = moveCount(m);
        const card = solverCardName(this.up[from][this.up[from].length - count]);
        return `${card}${count > 1 ? ` (+${count - 1})` : ""} column ${from + 1} → column ${to + 1}`;
      }
      case MOVE.FOUNDATION_TO_TABLEAU:
        return `${solverCardName((this.fHeight[from] - 1) * 4 + this.fSuit[from])} foundation → column ${to + 1}`;
    }
    return "?";
  }

  applyStockSteps(turns) {
    for (let t = 0; t < turns; t++) SolverState.stockStep(this.stock, this.waste, this.cardsToTurn);
    return this;
  }

  // The equivalent game commands (SolitaireCommand attributes), stock turns first.
  toCommands(m) {
    const commands = [];
    const stock = this.stock.slice(), waste = this.waste.slice();
    for (let t = moveTurns(m); t > 0; t--) commands.push({ action: SolverState.stockStep(stock, waste, this.cardsToTurn) });
    commands.push(this.playCommand(m));
    return commands;
  }

  playCommand(m) {
    const from = moveFrom(m), to = moveTo(m);
    switch (moveType(m)) {
      case MOVE.TABLEAU_TO_FOUNDATION:
        return { action: "move", src: ["faceUpTableauPiles", from], dest: ["foundations", to], numberOfCards: 1 };
      case MOVE.WASTE_TO_FOUNDATION:
        return { action: "move", src: ["waste"], dest: ["foundations", to], numberOfCards: 1 };
      case MOVE.WASTE_TO_TABLEAU:
        return { action: "move", src: ["waste"], dest: ["faceUpTableauPiles", to], numberOfCards: 1 };
      case MOVE.TABLEAU_TO_TABLEAU:
        return { action: "move", src: ["faceUpTableauPiles", from], dest: ["faceUpTableauPiles", to], numberOfCards: moveCount(m) };
      case MOVE.FOUNDATION_TO_TABLEAU:
        return { action: "move", src: ["foundations", from], dest: ["faceUpTableauPiles", to], numberOfCards: 1 };
    }
    return null;
  }
}
