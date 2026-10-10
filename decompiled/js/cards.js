// Ranks, suits and the card model.
//
// Rank and Suit objects are singletons (solitaireRanks / solitaireSuits), so
// they can be compared with ===.

class Rank {
  constructor(value) {
    this.value = value; // 0 = Ace ... 12 = King
  }

  letter() {
    return "A23456789TJQK"[this.value];
  }

  nextLower() {
    return this.value === 0 ? null : solitaireRanks[this.value - 1];
  }

  nextHigher() {
    return this.value === 12 ? null : solitaireRanks[this.value + 1];
  }
}

class Suit {
  constructor(value) {
    this.value = value; // 0 = Clubs, 1 = Diamonds, 2 = Hearts, 3 = Spades
  }

  letter() {
    return "CDHS".charAt(this.value);
  }

  color() {
    return this.letter() === "C" || this.letter() === "S" ? "black" : "red";
  }
}

const solitaireRanks = range(13).map((i) => new Rank(i));
const solitaireSuits = range(4).map((i) => new Suit(i));

let nextCardId = 0;

class CardModel {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
    // Also used as the DOM id of the card's element.
    this.id = "id" + nextCardId++;
  }
}
