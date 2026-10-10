// Small helpers shared by the models and controllers.
//
// All game scripts are plain (non-module) scripts loaded in order from
// index.html, so top-level `function`/`class`/`const` declarations here are
// visible to every later script. No build step is needed.

function assert(exp, ...messages) {
  if (!exp) {
    consoleLog("Assertion failed");
    consoleLog(...messages);
    throw new Error("Assertion error: " + messages);
  }
}

function consoleLog(...args) {
  try {
    console.log(...args);
  } catch (error) {}
}

// [0, 1, ..., n-1]
function range(n) {
  return Array.from({ length: n }, (_x, i) => i);
}

function last(array) {
  return array[array.length - 1];
}

// Returns a shuffled copy. "Inside-out" Fisher–Yates, exactly as in
// underscore 1.3.1's _.shuffle, so a given Math.random sequence deals the same
// game as the original site. Swap in a seeded random here for reproducible deals.
function shuffle(array) {
  const shuffled = [];
  array.forEach((value, index) => {
    if (index === 0) {
      shuffled[0] = value;
      return;
    }
    const rand = Math.floor(Math.random() * (index + 1));
    shuffled[index] = shuffled[rand];
    shuffled[rand] = value;
  });
  return shuffled;
}

// Element with the smallest fn(element); first one wins on ties, undefined if empty.
function minBy(array, fn) {
  let best, bestValue = Infinity;
  for (const item of array) {
    const value = fn(item);
    if (value < bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}

// ---- "New game" protection --------------------------------------------------
// After a few moves window.GAME_IN_PROGRESS is set (see updateUiState) and
// anything that would throw the current game away asks for confirmation.

function okToStartNewGame() {
  return !window.GAME_IN_PROGRESS || !!confirm("Start new game?");
}

function protectNewGame(fn) {
  return function (_e) {
    if (okToStartNewGame()) fn.apply(this, arguments);
  };
}

// ---- Touch-friendly click handler --------------------------------------------
// Handlers are bound to "click touchstart". On touch devices the touchstart
// fires immediately, and the synthetic click that follows ~300ms later is
// ignored for 5 seconds.

let suppressClicks = null;

function fastClick(fn) {
  return function (e) {
    if (suppressClicks && e.type === "click") return;
    if (e.type === "touchstart") {
      if (suppressClicks) clearTimeout(suppressClicks);
      suppressClicks = setTimeout(() => {
        suppressClicks = null;
      }, 5000);
    }
    fn.apply(this, arguments);
  };
}
