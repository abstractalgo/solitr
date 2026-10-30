// Klondike board layout and click behaviour.
//
//   [stock] [waste]         [found.0] [found.1] [found.2] [found.3]
//   [tab.0] [tab.1] [tab.2] [tab.3]   [tab.4]   [tab.5]   [tab.6]

class KlondikeController extends SolitaireBaseController {
  calculateGeometry() {
    super.calculateGeometry();
    const ModelClass = this.constructor.ModelClass;
    this.stockPosition = { left: this.padding.left, top: this.padding.top };
    this.wastePosition = { left: this.padding.left + this.columnOffset, top: this.padding.top };
    this.foundationPositions = range(ModelClass.numberOfFoundations).map((i) => ({
      left: this.padding.left + (3 + i) * this.columnOffset,
      top: this.padding.top,
    }));
    this.tableauPilePositions = range(ModelClass.numberOfTableauPiles).map((i) => ({
      left: this.padding.left + i * this.columnOffset,
      top: this.padding.top + this.rowOffset,
    }));
    this.gameWidth =
      this.padding.left + this.columnOffset * (ModelClass.numberOfTableauPiles - 1) + this.cardDimensions.width;
  }

  appendBaseElements() {
    super.appendBaseElements();
    for (let i = 0; i < (this.foundationPositions || []).length; i++) {
      this.makeBaseCardElement("foundationBase", "foundationBase" + i, this.foundationPositions[i]);
    }
    // The "recycle" image shown in the stock slot once the stock is empty.
    this.makeBaseCardElement("turnOverWasteImage", "turnOverWasteImage", this.stockPosition);
  }

  registerEventHandlers() {
    super.registerEventHandlers();
    $(document).on("click touchstart", "#turnOverWasteImage", fastClick(this.unlessSuspended(this.turnOverWaste.bind(this))));
  }

  updateUiState() {
    super.updateUiState();
    if (this.model.stock.length > 0 || this.model.waste.length > 0) $(".turnOverWasteImage").show();
    else $(".turnOverWasteImage").hide();
  }

  // Clicking the top stock card turns cards onto the waste.
  clickCard(card, e) {
    if (last(this.model.stock) === card) {
      e.preventDefault();
      this.turnStock(e);
    }
  }

  // Double-click sends a card to a foundation if it fits.
  dblclickCard(card, e) {
    e.preventDefault();
    this.playToAnyFoundation(card);
  }

  turnStock() {
    this.processUserCommand(new SolitaireCommand({ action: "turnStock" }));
  }

  turnOverWaste(e) {
    if (this.model.canTurnOverWaste()) {
      e.preventDefault();
      this.processUserCommand(new SolitaireCommand({ action: "turnOverWaste" }));
    }
  }

  playToAnyFoundation(card) {
    const cards = this.model.movedWithCard(card);
    if (!cards || this.model.getLocator(card)[0] === "foundations") return;
    for (let i = 0; i < this.model.foundations.length; i++) {
      if (this.model.accepts(["foundations", i], cards)) {
        this.processUserCommand(
          new SolitaireCommand({
            action: "move",
            src: this.model.getLocator(card),
            dest: ["foundations", i],
            numberOfCards: 1,
          }),
        );
        break;
      }
    }
  }
}

class KlondikeTurnThreeController extends KlondikeController {}
KlondikeTurnThreeController.ModelClass = KlondikeTurnThreeModel;
