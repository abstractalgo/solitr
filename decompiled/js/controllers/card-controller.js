// View for a single card: one absolutely positioned <div>.
//
// The board controller first computes a "resting state" for every card
// (position, z-index, face up/down) via setRestingState(), then either jumps or
// animates the card there. All DOM changes go through the element's jQuery fx
// queue, so they run in order after any animation already in progress.

class CardController {
  constructor(model) {
    this.model = model;
  }

  appendTo(rootElement) {
    this.element = document.createElement("div");
    // e.g. "card cardback cardqh" – see css/cards-1x.css
    this.element.className = ("card cardback card" + this.model.rank.letter() + this.model.suit.letter()).toLowerCase();
    this.element.id = this.model.id;
    $(this.element).css(this.constructor.size);
    $(rootElement).append(this.element);
    this.hasCardbackClass = true;
  }

  destroy() {
    $(this.element).remove();
  }

  setRestingState(pos, zIndex, faceUp) {
    this.restingState = { position: { ...pos }, zIndex, faceUp };
  }

  jumpToRestingPosition() {
    const currentState = { ...this.restingState };
    $(this.element).queue((next) => {
      $(this.element).css({ zIndex: currentState.zIndex }).css(currentState.position);
      next();
    });
  }

  // `options` is a jQuery animate options object, e.g. SolitaireBaseController.speeds.move.
  // With `liftoff` the card is raised above everything else while it travels.
  animateToRestingPosition(options, liftoff = true) {
    const currentState = { ...this.restingState };
    $(this.element).queue((next) => {
      $(this.element).css({ zIndex: currentState.zIndex + (liftoff ? 1000 : 0) });
      next();
    });
    $(this.element).animate(currentState.position, options);
    $(this.element).queue((next) => {
      $(this.element).css({ zIndex: currentState.zIndex });
      next();
    });
  }

  jumpToRestingFace() {
    const hasCardbackClass = !this.restingState.faceUp;
    $(this.element).queue((next) => {
      if (this.hasCardbackClass !== hasCardbackClass) {
        this.hasCardbackClass = hasCardbackClass;
        $(this.element).toggleClass("cardback", hasCardbackClass);
      }
      next();
    });
  }

  // Flip: lift slightly, squash horizontally to 0, swap face, expand back, settle.
  // (`scale` / `scaleX` animation comes from vendor/jquery.transform.js.)
  animateToRestingFace(options) {
    $(this.element).animate({ scale: 1.08 }, { duration: options.duration / 9, easing: "linear" });
    $(this.element).animate({ scaleX: 0 }, { duration: (3 * options.duration) / 9, easing: "linear" });
    this.jumpToRestingFace();
    $(this.element).animate({ scaleX: 1 }, { duration: (4 * options.duration) / 9, easing: "linear" });
    $(this.element).animate({ scale: 1 }, { duration: options.duration / 9, easing: "linear" });
  }
}
// Must match the card images (images/1x is exactly this size).
CardController.size = { width: 79, height: 123 };
