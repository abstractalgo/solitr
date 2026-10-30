// Klondike rules: dealing, what may be placed where, scoring, auto-finish, win check.

class KlondikeModel extends SolitaireBaseModel {
  // `deck`: the shuffled deck of an earlier game, to deal the same game again.
  constructor(deck) {
    super();
    this.faceUpTableauPiles = range(this.constructor.numberOfTableauPiles).map(() => []);
    this.faceDownTableauPiles = range(this.constructor.numberOfTableauPiles).map(() => []);
    this.stock = [];
    this.waste = [];
    this.foundations = range(this.constructor.numberOfFoundations).map(() => []);
    this.deck = deck || shuffle(this.createDeck());
  }

  // Standard (Windows-style) scoring. Points are per command, see executeCommand.
  scoreForCommand(cmd) {
    if (cmd.action === "flip") return 5;
    if (cmd.action === "move") {
      if (cmd.src[0] === "waste" && cmd.dest[0] === "faceUpTableauPiles") return 5;
      if (cmd.src[0] === "faceUpTableauPiles" && cmd.dest[0] === "foundations") return 10;
      if (cmd.src[0] === "waste" && cmd.dest[0] === "foundations") return 10;
      if (cmd.src[0] === "foundations" && cmd.dest[0] === "faceUpTableauPiles") return -15;
    }
    return 0;
  }

  // Column i gets i face-down cards plus one face-up card; the rest is the stock.
  // Cards are taken from the end of the shuffled deck.
  deal() {
    const deckCopy = this.deck.slice(0);
    for (let i = 0; i < this.faceDownTableauPiles.length; i++) {
      for (let j = 0; j < i; j++) this.faceDownTableauPiles[i].push(deckCopy.pop());
      this.faceUpTableauPiles[i].push(deckCopy.pop());
    }
    while (deckCopy.length) this.stock.push(deckCopy.pop());
  }

  createDeck() {
    const deck = [];
    for (const rank of solitaireRanks) {
      for (const suit of solitaireSuits) deck.push(new CardModel(rank, suit));
    }
    return deck;
  }

  canTurnOverWaste() {
    return this.stock.length === 0 && this.waste.length > 0;
  }

  // May `cards` (a run, bottom card first) be dropped onto the pile at `locator`?
  accepts(locator, cards) {
    assert(cards.length >= 1);
    if (locator[0] === "foundations") {
      // One card at a time, same suit, ascending from Ace.
      if (cards.length !== 1) return false;
      const topMostCard = last(this.foundations[locator[1]]);
      return topMostCard
        ? topMostCard.rank.nextHigher() === cards[0].rank && topMostCard.suit === cards[0].suit
        : cards[0].rank.letter() === "A";
    }
    if (locator[0] === "faceUpTableauPiles") {
      // Alternating colour, descending; only a King may go into an empty column.
      const topMostCard = last(this.faceUpTableauPiles[locator[1]]);
      return topMostCard
        ? topMostCard.rank.nextLower() === cards[0].rank && topMostCard.suit.color() !== cards[0].suit.color()
        : this.faceDownTableauPiles[locator[1]].length === 0 && cards[0].rank.letter() === "K";
    }
    return false;
  }

  // The cards that would be picked up when grabbing `card`, or null if it can't be picked up.
  movedWithCard(card) {
    const locator = this.getLocator(card);
    const collection = this.getCollection(locator);
    switch (locator[0]) {
      case "waste":
      case "foundations":
        return collection.indexOf(card) === collection.length - 1 ? [card] : null;
      case "faceUpTableauPiles":
        return collection.slice(collection.indexOf(card));
      default:
        return null;
    }
  }

  // Called after every command; a returned command is executed automatically.
  nextAutoCommand() {
    const flipCommand = this.autoFlipCommand();
    if (flipCommand != null) return flipCommand;

    // Auto-finish: once the stock is used up, at most one card is in the waste
    // and every card is face up, the game is won. Move the lowest card to a
    // foundation, one per call.
    let isObviouslyWon = true;
    if (this.stock.length > 0 || this.waste.length > 1) isObviouslyWon = false;
    for (const pile of this.faceDownTableauPiles) {
      if (pile.length > 0) isObviouslyWon = false;
    }

    if (isObviouslyWon) {
      const candidateLocators = [];
      if (this.getCollection(["waste"]).length > 0) candidateLocators.push(["waste"]);
      for (let i = 0; i < this.faceUpTableauPiles.length; i++) {
        const locator = ["faceUpTableauPiles", i];
        if (this.getCollection(locator).length > 0) candidateLocators.push(locator);
      }
      const srcLocator = minBy(candidateLocators, (lo) => last(this.getCollection(lo)).rank.value);
      if (srcLocator) {
        const srcCard = last(this.getCollection(srcLocator));
        for (let i = 0; i < this.foundations.length; i++) {
          const destLocator = ["foundations", i];
          if (this.accepts(destLocator, [srcCard])) {
            return new SolitaireCommand({
              action: "move",
              src: srcLocator,
              dest: destLocator,
              numberOfCards: 1,
              initiator: "auto",
            });
          }
        }
      }
    }
    return null;
  }

  isWon() {
    if (window.SOLITR_WIN) return true; // debug: set in the console to trigger the win dialog
    for (const foundation of this.foundations) {
      if (foundation.length === 0) return false;
      if (last(foundation).rank.letter() !== "K") return false;
    }
    return true;
  }
}
KlondikeModel.cardsToTurn = null;
KlondikeModel.numberOfFoundations = 4;
KlondikeModel.numberOfTableauPiles = 7;

class KlondikeTurnOneModel extends KlondikeModel {
  // Turn-one games are penalised for going through the deck again.
  scoreForCommand(cmd) {
    return cmd.action === "turnOverWaste" ? -100 : super.scoreForCommand(cmd);
  }
}
KlondikeTurnOneModel.cardsToTurn = 1;

class KlondikeTurnThreeModel extends KlondikeModel {}
KlondikeTurnThreeModel.cardsToTurn = 3;
