// Board controller: owns the model, one CardController per card, the empty-pile
// outlines, input handling (click / double-click / drag and drop) and the
// command -> animation pipeline.
//
// Flow of a user action:
//   input handler -> processUserCommand(cmd)
//     -> processCommand: model.executeCommand(cmd), then renderAfterCommand(cmd)
//          -> updateUiState(): compute every card's resting state from the model
//          -> animateCards(cmd): this["animate" + Action](cmd) animates the cards
//             involved, every other card jumps to its resting state
//     -> after the animation delay, run model.nextAutoCommand() if there is one
//        (auto flip / auto finish), otherwise check isWon() or resume input.
//
// Subclasses (KlondikeController) provide geometry (stockPosition,
// wastePosition, foundationPositions, tableauPilePositions) and the
// click / double-click behaviour.

class SolitaireBaseController {
  constructor() {
    this.model = null;
  }

  // Entry point used by the page: KlondikeTurnThreeController.setupGame().
  static setupGame() {
    $(() => {
      window.solitaireController = new this();
      window.solitaireController.appendTo("#solitaireCanvas");
    });
  }

  appendTo(root) {
    assert(this.rootElement == null);
    this.rootElement = document.createElement("div");
    $(root).append(this.rootElement);
    $("#solitr-option-score")
      .prop("checked", window.store.get("solitr-option-score"))
      .change() // let bootstrap-toggle redraw
      .change(this.optionsChanged.bind(this));
    this.calculateGeometry();
    this.appendBaseElements();
    this.registerEventHandlers();
    this.newGame();
  }

  // Spacing derived from the card size. Subclasses add pile positions.
  calculateGeometry() {
    this.cardDimensions = CardController.size;
    this.padding = {
      left: (0.25 * this.cardDimensions.width) | 0,
      top: (0.25 * this.cardDimensions.width) | 0,
    };
    this.columnOffset = (1.25 * this.cardDimensions.width) | 0;
    this.rowOffset = (1.25 * this.cardDimensions.height) | 0;
    this.faceDownTableauFanningOffset = 20; // vertical gap between face-down cards in a column
    this.faceUpTableauFanningOffset = 20; // vertical gap between face-up cards in a column
    this.wasteFanningOffset = 20; // horizontal gap between fanned waste cards (turn three)
  }

  getCardController(cardOrId) {
    return this.cardControllers[cardOrId instanceof CardModel ? cardOrId.id : cardOrId];
  }

  getCardControllers(cardsOrIds) {
    return cardsOrIds.map((c) => this.getCardController(c));
  }

  // Input is ignored while commands are animating.
  suspendUi() {
    this.uiSuspended = true;
  }

  // Input resumes once the board has settled after a move, undo or new deal.
  resumeUi() {
    this.uiSuspended = false;
    $(document).trigger("solitr-board-settled");
  }

  unlessSuspended(fn) {
    const self = this;
    return function () {
      if (!self.uiSuspended) fn.apply(this, arguments);
    };
  }

  newGame() {
    const model = new this.constructor.ModelClass();
    model.deal();
    this.startGame(model);
  }

  // Deals the current game's shuffle again (the "Re-play" button after a win).
  // The deck holds the cards in their shuffled order; deal() never changes it.
  replayGame() {
    const model = new this.constructor.ModelClass(this.model.deck);
    model.deal();
    this.startGame(model);
  }

  // Shows an already dealt model on the board (used by newGame and the deal generator).
  startGame(model) {
    this.model = model;
    $("#win-modal").modal("hide");
    $(".solitr-replay").removeClass("visible");
    for (const id in this.cardControllers || {}) this.cardControllers[id].destroy();
    this.cardControllers = {};
    for (const card of this.model.deck) {
      this.cardControllers[card.id] = new CardController(card);
      this.cardControllers[card.id].appendTo(this.rootElement);
    }
    this.renderAfterCommand(null);
    this.resumeUi();
  }

  // Outlines of empty piles, drawn underneath the cards.
  appendBaseElements() {
    this.baseContainer = document.createElement("div");
    this.baseContainer.className = "baseContainer";
    for (let i = 0; i < (this.tableauPilePositions || []).length; i++) {
      this.makeBaseCardElement("tableauPileBase", "tableauPileBase" + i, this.tableauPilePositions[i]);
    }
    $(this.rootElement).append(this.baseContainer);

    // Animating `scale` once on a throwaway element initialises jquery.transform.
    const dummy = document.createElement("div");
    dummy.className = "dummy";
    $(this.rootElement).append(dummy);
    $(dummy).css({ scale: 1 });
  }

  makeBaseCardElement(className, id, position) {
    const e = document.createElement("div");
    e.className = className + " baseCardElement";
    if (id) e.id = id;
    e.style.cssText =
      "left: " + position.left + "px; top: " + position.top + "px;" +
      "width: " + this.cardDimensions.width + "px; height: " + this.cardDimensions.height + "px;";
    $(this.baseContainer).append(e);
  }

  // Compute the resting state (position / z-index / face) of every card from
  // the model, and refresh the menu bar.
  updateUiState() {
    let zIndex = 1000;
    for (const card of this.model.stock || []) {
      this.getCardController(card.id).setRestingState(this.stockPosition, zIndex++, false);
    }

    // Waste: only the top `cardsToTurn` cards are fanned out to the right.
    zIndex = 1000;
    const waste = this.model.waste || [];
    for (let i = 0; i < waste.length; i++) {
      const pos = { ...this.wastePosition };
      const fanIndex = Math.max(i + Math.min(waste.length, this.model.constructor.cardsToTurn) - waste.length, 0);
      pos.left += fanIndex * this.wasteFanningOffset;
      this.getCardController(waste[i].id).setRestingState(pos, zIndex++, true);
    }

    for (let i = 0; i < (this.model.foundations || []).length; i++) {
      zIndex = 1000;
      for (const card of this.model.foundations[i]) {
        this.getCardController(card.id).setRestingState(this.foundationPositions[i], zIndex++, true);
      }
    }

    for (let i = 0; i < (this.model.faceDownTableauPiles || []).length; i++) {
      zIndex = 1000;
      const pos = { ...this.tableauPilePositions[i] };
      for (const card of this.model.faceDownTableauPiles[i]) {
        this.getCardController(card.id).setRestingState(pos, zIndex++, false);
        pos.top += this.faceDownTableauFanningOffset;
      }
      for (const card of this.model.faceUpTableauPiles[i]) {
        this.getCardController(card.id).setRestingState(pos, zIndex++, true);
        pos.top += this.faceUpTableauFanningOffset;
      }
    }

    $(".solitr-undo-button").toggleClass("disabled", this.model.undoStack.length === 0);
    $("#game-score").toggleClass("active", this.displayScore());
    $("#game-score span").text("" + this.model.score);
    window.GAME_IN_PROGRESS = this.model.undoStack.length > 6;
  }

  processUserCommand(cmd) {
    this.suspendUi();
    if (this.model.startedAt == null) this.model.startedAt = Date.now();
    const nextAnimationDelay = this.processCommand(cmd);
    const nextCmd = this.model.nextAutoCommand();
    if (nextCmd) setTimeout(() => this.processUserCommand(nextCmd), nextAnimationDelay);
    else if (this.model.isWon()) setTimeout(() => this.youWin(), nextAnimationDelay);
    else this.resumeUi();
  }

  // Returns how long to wait (ms) before the next command may start.
  processCommand(cmd) {
    this.model.executeCommand(cmd);
    return this.renderAfterCommand(cmd);
  }

  // Undo the most recent command group, one command at a time (newest first).
  undo(e) {
    if (e != null) e.preventDefault();
    if (this.model.undoStack.length === 0) return;
    this.suspendUi();
    const commandList = last(this.model.undoStack);
    const cmd = commandList.pop();
    const nextAnimationDelay = this.processCommand(cmd);
    if (commandList.length) {
      setTimeout(() => this.undo(), nextAnimationDelay);
    } else {
      this.model.undoStack.pop();
      this.updateUiState();
      this.resumeUi();
    }
  }

  renderAfterCommand(cmd) {
    this.updateUiState();
    return this.animateCards(cmd);
  }

  animateCards(cmd) {
    let nextAnimationDelay = 0;
    if (cmd != null) {
      const methodName = "animate" + cmd.action.charAt(0).toUpperCase() + cmd.action.slice(1);
      if (this[methodName]) nextAnimationDelay = this[methodName](cmd);
    }
    // Everything not animated above snaps into place (queued after any running animation).
    for (const controller of Object.values(this.cardControllers)) {
      controller.jumpToRestingPosition();
      controller.jumpToRestingFace();
    }
    return nextAnimationDelay;
  }

  // ---- Per-action animations (return the delay before the next command) ----

  animateMove(cmd) {
    const speeds = this.constructor.speeds;
    const speed = cmd.direction === "undo" ? speeds.undoMove : cmd.userAction === "drag" ? speeds.snap : speeds.move;
    const movedCards = this.model.getCollection(cmd.direction === "do" ? cmd.dest : cmd.src).slice(-cmd.numberOfCards);
    for (const controller of this.getCardControllers(movedCards)) controller.animateToRestingPosition(speed);

    // Taking a card off (or back onto) the waste re-fans the visible waste cards.
    if (cmd.src[0] === "waste" || cmd.dest[0] === "waste") {
      const shiftingCards = this.model.waste
        .slice(-this.model.constructor.cardsToTurn)
        .filter((c) => movedCards.indexOf(c) === -1);
      for (const controller of this.getCardControllers(shiftingCards)) {
        controller.animateToRestingPosition(speeds.shift, false);
      }
    }
    return speed.duration;
  }

  // Not emitted by Klondike (it uses "move" with a foundation dest); kept from the original.
  animateMoveToFoundation(cmd) {
    const speeds = this.constructor.speeds;
    const movedCards = this.model.getCollection(cmd.direction === "do" ? cmd.dest : cmd.src).slice(-cmd.numberOfCards);
    for (const controller of this.getCardControllers(movedCards)) {
      controller.animateToRestingPosition(speeds.moveToFoundation);
    }
    return speeds.moveToFoundation.duration;
  }

  animateFlip(cmd) {
    const speeds = this.constructor.speeds;
    let card;
    if (cmd.direction === "do") {
      assert(this.model.faceUpTableauPiles[cmd.tableauPileIndex].length === 1);
      card = this.model.faceUpTableauPiles[cmd.tableauPileIndex][0];
    } else {
      card = last(this.model.faceDownTableauPiles[cmd.tableauPileIndex]);
    }
    this.getCardController(card).animateToRestingFace(speeds.flip);
    return speeds.flip.duration / (cmd.direction === "do" ? 3 : 2);
  }

  animateTurnStock(cmd) {
    const speeds = this.constructor.speeds;
    const cardsToTurn = this.model.constructor.cardsToTurn;
    if (cmd.direction === "do") {
      const turnedCards = this.model.waste.slice(-cardsToTurn);
      for (const controller of this.getCardControllers(turnedCards)) controller.animateToRestingPosition(speeds.turn);
      // The previously fanned cards collapse only after the new ones have landed.
      const previousFannedCards = this.model.waste.slice(2 * -cardsToTurn + 1, -cardsToTurn);
      for (const controller of this.getCardControllers(previousFannedCards)) {
        $(controller.element).delay(speeds.turn.duration);
      }
    } else {
      const turnedCards = this.model.stock.slice(-cmd.cardsTurned);
      for (const controller of this.getCardControllers(turnedCards)) {
        controller.jumpToRestingFace();
        controller.animateToRestingPosition(speeds.turn);
      }
    }
    return speeds.turn.duration / 2;
  }

  // ---- Input ------------------------------------------------------------------

  registerEventHandlers() {
    // Wraps a handler so it receives the CardModel of the clicked .card element.
    const handleCardEvent = (cb) => {
      const self = this;
      return this.unlessSuspended(function (e) {
        const card = self.getCardController(this.id);
        if (card != null) cb(card.model, e);
      });
    };
    $(document).on("click touchstart", ".card:not(:animated)", fastClick(handleCardEvent(this.clickCard.bind(this))));
    $(document).on("dblclick", ".card:not(:animated)", handleCardEvent(this.dblclickCard.bind(this)));
    $(document).on("click touchstart", ".solitr-undo-button", fastClick(this.unlessSuspended(this.undo.bind(this))));
    // Input stays suspended on a won board, but a new game may still be started.
    const unlessBusy = (fn) => (...args) => {
      if (!this.uiSuspended || this.model.finishedAt) fn(...args);
    };
    $(document).on("click touchstart", ".solitr-new-game", fastClick(unlessBusy(protectNewGame(this.newGame.bind(this)))));
    $(document).on("click touchstart", ".solitr-replay", fastClick(unlessBusy(this.replayGame.bind(this))));
    this._registerDragAndDrop();
  }

  // Drag and drop on top of jQuery UI's mouse widget (see js/rawdraggable.js).
  // A dragged run is dropped on whichever accepting pile its bounding box
  // overlaps most; with no overlap it slides back. Cards that can't be moved
  // (e.g. buried waste cards) are dragged as a half-transparent ghost copy that
  // always slides back.
  _registerDragAndDrop() {
    $(this.rootElement).rawdraggable({
      distance: 3, // px of movement before a click becomes a drag

      mouseCapture: (e) => {
        if (this.uiSuspended) return false;
        this.dragState = {};
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const isRestingCard = $(element).hasClass("card") && element.id && !$(element).is(":animated");
        this.dragState.startController = isRestingCard && this.getCardController(element.id);
        if (!this.dragState.startController) return false;
        const locator = this.model.getLocator(this.dragState.startController.model);
        return (!locator || locator[0] !== "stock") && isRestingCard;
      },

      mouseStart: (e) => {
        const dragState = this.dragState;
        dragState.startPagePosition = { left: e.pageX, top: e.pageY };
        dragState.cards = this.model.movedWithCard(dragState.startController.model);
        dragState.controllers = this.getCardControllers(dragState.cards || []);
        if (dragState.cards) {
          dragState.elements = dragState.controllers.map((c) => c.element);
        } else {
          const clone = $(dragState.startController.element).clone();
          clone.removeAttr("id").css({ opacity: "0.5" }).appendTo(this.rootElement);
          dragState.elements = clone.toArray();
        }
        dragState.originalElementPositions = dragState.elements.map((el) => $(el).position());
        for (const el of dragState.elements) {
          const zIndex = $(el).css("zIndex") || "0";
          $(el).css({ zIndex: parseInt(zIndex, 10) + 2000 });
        }
      },

      mouseDrag: (e) => {
        const dragState = this.dragState;
        if (!dragState || !dragState.elements) return;
        for (let i = 0; i < dragState.elements.length; i++) {
          $(dragState.elements[i]).css({
            left: dragState.originalElementPositions[i].left + (e.pageX - dragState.startPagePosition.left),
            top: dragState.originalElementPositions[i].top + (e.pageY - dragState.startPagePosition.top),
          });
        }
      },

      mouseStop: (_e) => {
        const dragState = this.dragState;
        if (!dragState || !dragState.elements) return;
        const speeds = this.constructor.speeds;

        if (!dragState.cards) {
          // Ghost copy: slide back and remove.
          for (let i = 0; i < dragState.elements.length; i++) {
            $(dragState.elements[i]).animate(
              { left: dragState.originalElementPositions[i].left, top: dragState.originalElementPositions[i].top },
              {
                ...speeds.snapBack,
                complete() {
                  $(this).remove();
                },
              },
            );
          }
          return;
        }

        const $elements = dragState.elements.map((el) => $(el));
        const extent = {
          minLeft: Math.min(...$elements.map((e) => e.position().left)),
          minTop: Math.min(...$elements.map((e) => e.position().top)),
          maxLeft: Math.max(...$elements.map((e) => e.position().left + e.width())),
          maxTop: Math.max(...$elements.map((e) => e.position().top + e.height())),
        };
        let maxOverlapArea = 0;
        let targetDropZone = null;
        for (const dropZone of this.getDropZones(dragState.cards)) {
          const overlap = {};
          overlap.left = Math.max(dropZone.left, extent.minLeft);
          overlap.width = Math.max(Math.min(dropZone.left + dropZone.width, extent.maxLeft) - overlap.left, 0);
          overlap.top = Math.max(dropZone.top, extent.minTop);
          overlap.height = Math.max(Math.min(dropZone.top + dropZone.height, extent.maxTop) - overlap.top, 0);
          overlap.area = overlap.width * overlap.height;
          if (overlap.area > maxOverlapArea) {
            maxOverlapArea = overlap.area;
            targetDropZone = dropZone;
          }
        }

        if (targetDropZone) {
          this.move(dragState.cards, targetDropZone.locator);
        } else {
          for (const controller of dragState.controllers) controller.animateToRestingPosition(speeds.snapBack);
        }
      },
    });
  }

  // Rectangles ({locator, left, top, width, height}) of every pile that accepts `cards`.
  getDropZones(cards) {
    return this.model
      .allLocators()
      .filter((locator) => this.model.accepts(locator, cards))
      .map((locator) => ({ locator, ...this.cardDimensions, ...this.dropZoneFor(locator) }));
  }

  // A pile's drop zone is its top card, or its base position when empty.
  dropZoneFor(locator) {
    const card = last(this.model.getCollection(locator));
    return card != null ? this.getCardController(card).restingState.position : this.getBasePosition(locator);
  }

  getBasePosition(locator) {
    switch (locator[0]) {
      case "foundations":
        return this.foundationPositions[locator[1]];
      case "faceDownTableauPiles":
      case "faceUpTableauPiles":
        return this.tableauPilePositions[locator[1]];
      case "stock":
        return this.stockPosition;
      default:
        assert(locator[0] === "waste");
        return this.wastePosition;
    }
  }

  move(cards, dest) {
    assert(cards instanceof Array);
    if (dest[0] !== "faceUpTableauPiles") assert(cards.length === 1, dest, cards);
    this.processUserCommand(
      new SolitaireCommand({
        action: "move",
        src: this.model.getLocator(cards[0]),
        dest,
        numberOfCards: cards.length,
        userAction: "drag",
      }),
    );
  }

  // ---- Debug helpers (call from the console via window.solitaireController) ----

  // Returns a JS snippet that restores the current position: paste it back into the console.
  dump() {
    return "solitaireController.load('" + JSON.stringify(this.model.dumpHash()) + "');";
  }

  load(s) {
    this.model.loadHash(JSON.parse(s));
    this.renderAfterCommand(null);
    $(document).trigger("solitr-board-settled");
  }

  _drawVisualization(rect) {
    $('<div class="visualization"></div>').css(rect).appendTo(this.rootElement);
  }

  // Highlights where `cards` could be dropped, e.g.
  // solitaireController._visualizeDropZones(solitaireController.model.waste.slice(-1))
  _visualizeDropZones(cards) {
    $(".visualization").remove();
    for (const dropZone of this.getDropZones(cards)) this._drawVisualization(dropZone);
  }

  // ---- Win / options ------------------------------------------------------------

  youWin() {
    this.suspendUi();
    this.model.finishedAt = Date.now();
    let win = "<p>Time: " + this.model.getTime() + "</p>";
    if (this.model.scoreForCommand && this.displayScore()) win += "<p>Score: " + this.model.score + "</p>";
    $("#win-modal .modal-body .score").html(win);
    // The won board stays up (time stopped) with "Re-play" in the header;
    // the modal's New Game button starts the next game.
    window.GAME_IN_PROGRESS = false;
    $(".solitr-undo-button").addClass("disabled");
    $(".solitr-replay").addClass("visible");
    $(document).trigger("solitr-board-settled");
    $("#win-modal").modal();
  }

  optionsChanged() {
    window.store.set("solitr-option-score", this.displayScore());
    this.updateUiState();
  }

  displayScore() {
    return Boolean($("#solitr-option-score").prop("checked"));
  }
}

// Animation timings (jQuery animate options). Durations in ms.
SolitaireBaseController.speeds = {
  snap: { duration: 50, easing: "linear" }, // dropped card settling onto its pile
  snapBack: { duration: 300, easing: "easeOutCubic" }, // invalid drop sliding back
  move: { duration: 450, easing: "swing" }, // double-click / auto moves
  undoMove: { duration: 300, easing: "swing" },
  moveToFoundation: { duration: 600, easing: "swing" },
  turn: { duration: 200, easing: "swing" }, // stock -> waste
  shift: { duration: 200, easing: "linear" }, // re-fanning the waste
  flip: { duration: 200 }, // turning a tableau card face up
};
