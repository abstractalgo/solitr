// Every change to the game state is a SolitaireCommand.
//
// A command is a plain bag of attributes:
//
//   action        "move" | "flip" | "turnStock" | "turnOverWaste"
//   direction     "do" | "undo"
//   initiator     "user" | "auto"   (auto = automatic flip / auto-finish move)
//   src, dest     locators, e.g. ["waste"], ["foundations", 2], ["faceUpTableauPiles", 5]
//   numberOfCards for "move"
//   tableauPileIndex for "flip"
//   userAction    "drag" when the move came from drag and drop (snaps instead of sliding)
//
// The model dispatches on direction + action:  "do" + "move" -> model.doMove(cmd),
// "undo" + "turnStock" -> model.undoTurnStock(cmd), and the controller animates
// with "animate" + action -> controller.animateMove(cmd). To add a new kind of
// move, add an action name and implement doX / undoX (and optionally animateX).

class SolitaireCommand {
  constructor(attributes) {
    this.direction = "do";
    this.initiator = "user";
    Object.assign(this, attributes);
  }

  createUndoCommand() {
    // Shallow copy (keeps the prototype), flipped to "undo".
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, { direction: "undo" });
  }
}
