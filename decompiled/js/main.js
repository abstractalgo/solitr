// Page wiring: picks Turn 1 / Turn 3 and starts the game, plus the small
// page-level behaviours that lived at the end of the original bundle.
//
// Variant selection: index.html?turn=1 plays Turn One, anything else Turn Three
// (the original site used two pages, "/" and "/klondike-turn-one").

(function () {
  const turnOne = new URLSearchParams(window.location.search).get("turn") === "1";

  // Mark the active variant in the Options dropdown; the active button is not a link.
  $(() => {
    const active = $(turnOne ? "#option-turn-one" : "#option-turn-three");
    active.addClass("active").removeAttr("href");
  });

  (turnOne ? KlondikeTurnOneController : KlondikeTurnThreeController).setupGame();

  // Clicks inside the Options dropdown don't close it.
  $(document).on("click", ".dropdown-menu", (e) => e.stopPropagation());

  $(() => {
    $(".dropdown-toggle").dropdown();
  });

  // Mobile: block pull-to-refresh when a drag starts at the very top of the page.
  $(() => {
    let lastTouchY = 0;
    let preventPullToRefresh = false;
    $(document).on("touchstart", (e) => {
      if (e.originalEvent.touches.length === 1) {
        lastTouchY = e.originalEvent.touches[0].clientY;
        preventPullToRefresh = window.pageYOffset === 0;
      }
    });
    $(document).on("touchmove", (e) => {
      const touchY = e.originalEvent.touches[0].clientY;
      const touchYDelta = touchY - lastTouchY;
      lastTouchY = touchY;
      if (preventPullToRefresh) {
        preventPullToRefresh = false;
        if (touchYDelta > 0) e.preventDefault();
      }
    });
  });

  // Links that would leave the current game (e.g. switching variant) ask first.
  $(() => {
    $(".protect-game-in-progress").on("click", (e) => {
      if (!$(e.currentTarget).hasClass("active") && !okToStartNewGame()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
})();
