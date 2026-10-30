// Page wiring: starts the game (Turn 3 only), plus the small page-level
// behaviours that lived at the end of the original bundle.

(function () {
  KlondikeTurnThreeController.setupGame();

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
})();
