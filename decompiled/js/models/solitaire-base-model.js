// Game-independent model logic: piles addressed by "locators", command
// execution, undo stack and score.
//
// A locator names a pile:
//   ["stock"], ["waste"]                    -> this.stock / this.waste
//   ["foundations", i]                      -> this.foundations[i]
//   ["faceDownTableauPiles", i]             -> this.faceDownTableauPiles[i]
//   ["faceUpTableauPiles", i]               -> this.faceUpTableauPiles[i]
// Every pile is an array of CardModels, bottom card first.
//
// Each tableau column is two arrays: the face-down cards and the face-up run
// on top of them.

class SolitaireBaseModel {
  constructor() {
    // Array of command groups. One user action plus the automatic commands
    // that follow it (flips, auto-finish moves) form one group, so a single
    // Undo reverts all of them.
    this.undoStack = [];
    this.startedAt = null; // set on the first move
    this.finishedAt = null; // set when the game is won; stops the clock
    this.score = 0;
  }

  // Adds `score` (score never drops below 0); returns the change actually applied.
  updateScore(score) {
    const newScore = Math.max(0, this.score + score);
    const diff = newScore - this.score;
    this.score = newScore;
    return diff;
  }

  // Elapsed time as "mm:ss".
  getTime() {
    const end = this.finishedAt || Date.now();
    const time = typeof this.startedAt === "number" ? Math.floor((end - this.startedAt) / 1000) : 0;
    const min = Math.floor(time / 60);
    const sec = time - 60 * min;
    return (min < 10 ? "0" + min : min) + ":" + (sec < 10 ? "0" + sec : sec);
  }

  getCollection(locator) {
    return locator.length === 2 ? this[locator[0]][locator[1]] : this[locator[0]];
  }

  allLocators() {
    return [
      ...(this.foundations || []).map((_x, i) => ["foundations", i]),
      ...(this.faceDownTableauPiles || []).map((_x, i) => ["faceDownTableauPiles", i]),
      ...(this.faceUpTableauPiles || []).map((_x, i) => ["faceUpTableauPiles", i]),
      ...(this.stock ? [["stock"]] : []),
      ...(this.waste ? [["waste"]] : []),
    ];
  }

  // Locator of the pile containing `card`.
  getLocator(card) {
    for (const locator of this.allLocators()) {
      if (this.getCollection(locator).includes(card)) return locator;
    }
    assert(false, card);
    return null;
  }

  executeCommand(cmd) {
    // "do" + "move" -> this.doMove(cmd), "undo" + "flip" -> this.undoFlip(cmd), ...
    this[cmd.direction + cmd.action.charAt(0).toUpperCase() + cmd.action.slice(1)](cmd);

    if (this.scoreForCommand) {
      if (cmd.direction === "do") cmd.score = this.updateScore(this.scoreForCommand(cmd));
      else if (cmd.direction === "undo") this.updateScore(-cmd.score);
    }

    if (cmd.direction === "do") {
      const undoCommand = cmd.createUndoCommand();
      // Automatic commands join the group of the user command that caused them.
      if (cmd.initiator !== "auto") this.undoStack.push([]);
      last(this.undoStack).push(undoCommand);
    }
  }

  // ---- Command implementations ---------------------------------------------

  doMove(cmd) {
    const src = this.getCollection(cmd.src);
    const dest = this.getCollection(cmd.dest);
    dest.push(...src.slice(-cmd.numberOfCards));
    for (let i = 0; i < cmd.numberOfCards; i++) src.pop();
  }

  undoMove(cmd) {
    const src = this.getCollection(cmd.src);
    const dest = this.getCollection(cmd.dest);
    src.push(...dest.slice(-cmd.numberOfCards));
    for (let i = 0; i < cmd.numberOfCards; i++) dest.pop();
  }

  doFlip(cmd) {
    this.faceUpTableauPiles[cmd.tableauPileIndex].push(this.faceDownTableauPiles[cmd.tableauPileIndex].pop());
  }

  undoFlip(cmd) {
    this.faceDownTableauPiles[cmd.tableauPileIndex].push(this.faceUpTableauPiles[cmd.tableauPileIndex].pop());
  }

  // Stock -> waste, `cardsToTurn` cards at a time (fewer if the stock runs out).
  doTurnStock(cmd) {
    for (cmd.cardsTurned = 0; cmd.cardsTurned < this.constructor.cardsToTurn && this.stock.length > 0; cmd.cardsTurned++) {
      this.waste.push(this.stock.pop());
    }
  }

  undoTurnStock(cmd) {
    for (let i = 0; i < cmd.cardsTurned; i++) {
      assert(this.waste.length);
      this.stock.push(this.waste.pop());
    }
  }

  // Empty stock: put the whole waste back onto the stock.
  doTurnOverWaste(_cmd) {
    while (this.waste.length) this.stock.push(this.waste.pop());
  }

  undoTurnOverWaste(_cmd) {
    while (this.stock.length) this.waste.push(this.stock.pop());
  }

  // ---- Automatic commands ----------------------------------------------------

  // A tableau column whose face-up run is empty but still has face-down cards
  // gets its top card turned over automatically.
  autoFlipCommand() {
    for (let i = 0; i < this.faceDownTableauPiles.length; i++) {
      if (this.faceDownTableauPiles[i].length > 0 && this.faceUpTableauPiles[i].length === 0) {
        return new SolitaireCommand({ action: "flip", tableauPileIndex: i, initiator: "auto" });
      }
    }
    return null;
  }

  // ---- Save / restore (debug helpers, see SolitaireBaseController.dump) -----

  dumpHash() {
    const hash = {};
    for (const locator of this.allLocators()) {
      // Array keys stringify to e.g. "faceUpTableauPiles,3".
      hash[locator] = this.getCollection(locator).map((card) => [card.rank.value, card.suit.value]);
    }
    hash.undoStack = this.undoStack;
    return hash;
  }

  loadHash(hash) {
    const deckCopy = this.deck.slice(0);
    for (const locator of this.allLocators()) {
      const collection = this.getCollection(locator);
      collection.length = 0;
      for (const [rank, suit] of hash[locator]) {
        const card = deckCopy.find((c) => c.rank.value === rank && c.suit.value === suit);
        collection.push(card);
        deckCopy.splice(deckCopy.indexOf(card), 1);
      }
    }
    this.undoStack = hash.undoStack;
    for (const list of this.undoStack) {
      // The original assigned `__proto__ = SolitaireCommand` (the constructor,
      // not its prototype); restoring the real prototype is what was intended.
      for (const cmd of list) Object.setPrototypeOf(cmd, SolitaireCommand.prototype);
    }
  }
}
