// Game timer in the top right corner (#game-timer).
//
// Shows the current game's time (model.getTime(): starts on the first move,
// stops when the game is won). Clicking it hides the time, leaving a dim
// "--:--" to click to bring it back; the choice is remembered like the score
// option.

$(() => {
  const $timer = $("#game-timer");

  const setShown = (shown) => {
    $timer.toggleClass("time-hidden", !shown);
    $timer.attr("title", shown ? "Hide timer" : "Show timer");
  };
  setShown(window.store.get("solitr-option-timer") !== false); // shown by default

  $timer.on("click", () => {
    const shown = $timer.hasClass("time-hidden");
    setShown(shown);
    window.store.set("solitr-option-timer", shown);
  });

  const update = () => {
    const controller = window.solitaireController;
    if (controller && controller.model) $timer.find(".solitr-timer-text").text(controller.model.getTime());
  };
  update();
  setInterval(update, 250);
});
