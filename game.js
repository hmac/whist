(function() {

  var _ = require("underscore")._;

  /*
    Game object
  */

  var Game = function(playerLimit) {
    var t, _i, _j, _ref, _results, _results1;
    this.playerLimit = playerLimit;
    this.tricks = [];
    this.scores = [];
    this.players = [];
    this.table = [];
    this.trumps = "";
    this.moves = [];
    this.expectedTurn = null;
    this.scores = {};
    this.begun = false;
    this.callbacks = [];
    this.cards = {};
    t = Math.floor(52 / this.playerLimit);
    this.rounds = (function() {
      _results1 = [];
      for (var _j = 7; 7 <= t ? _j <= t : _j >= t; 7 <= t ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).concat((function() {
      _results = [];
      for (var _i = _ref = t - 1; _ref <= 1 ? _i <= 1 : _i >= 1; _ref <= 1 ? _i++ : _i--){ _results.push(_i); }
      return _results;
    }).apply(this));
    this.round = 1;
    this.events = {};
    return this;
  };

  /*
    Export Game object
  */

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Game;
    }
    exports.Game = Game;
  }

  /*
    Enable events
  */

  Game.prototype.on = function(name, fn, context) {
    this.events[name] || (this.events[name] = []);
    this.events[name].push({
      fn:fn, 
      context:context
    });
  }

  Game.prototype.off = function(name, fn, context) {
    this.events[name] || (this.events[name] = []);
    var self = this;
    _.each(this.events[name], function(e) {
      if (e.fn == fn) {
        self.events[name].splice(self.events[name].indexOf(e), 1);
      }
    });
  },

  Game.prototype.trigger = function(name) {
    this.events[name] || (this.events[name] = []);
    var self = this;
    _.each(this.events[name], function(e) {
        var context = e.context || self;
        e.fn.call(context);
    });
  }


  Game.prototype.getState = function(playerID) {
    if (!playerID) {
      return null;
    }

    return {
      playerLimit:  this.playerLimit,
      table:        this.table,
      trumps:       this.trumps,
      expectedTurn: this.expectedTurn,
      round:        this.round,
      players:      this.players,
      hand:         this.cards[playerID],
      scores:       this.scores,
      tricks:       this.tricks,
      moves:        this.moves
    };

  };

  Game.prototype.join = function(playerID, cb) {
    this.players.push(playerID);
    this.scores[playerID] = 0;
    if (typeof cb === "function") {
      cb();
    }
    if (this.players.length === this.playerLimit) {
      this.start();
    }
  };

  Game.prototype.playerExists = function(playerID) {
    return this.players.indexOf(playerID) !== -1;
  };

  Game.prototype.start = function(options) {
    var winner;
    console.log('start');
    this.begun = true;
    this.tricks[this.round - 1] = {};
    this.deal(this.rounds[this.round - 1]);
    if (this.round === 1) {
      this.trumps = randomSuit();
      this.expectedTurn = {
        type: "bid",
        playerID: this.players[0]
      };
      this.trigger('update');
    } else {
      winner = options.winner;
      this.expectedTurn = {
        type: "trumps",
        playerID: winner
      };
      this.trigger('update');
    }
  };

  Game.prototype.makeMove = function(move, cb) {
    var card_removed, _base, _name;
    console.log('\nmove attempt:', move);
    if (!(move.type === this.expectedTurn.type && move.playerID === this.expectedTurn.playerID)) {
      cb();
      return;
    }
    if (!(this.validateMove(move))) {
      console.log("--> invalid move");
      cb();
      return;
    }
    if (move.type === "trumps") {
      console.log('--> trumps move');
      this.trumps = move.value;
      this.expectedTurn = {
        type: "bid",
        playerID: this.players[0]
      };
      this.trigger('update');
      cb();
      return;
    }
    (_base = this.moves)[_name = this.round - 1] || (_base[_name] = []);
    this.moves[this.round - 1].push(move);
    if (move.type === 'bid') {
      if (move.playerID === this.players[this.players.length - 1]) {
        this.expectedTurn = {
          type: "card",
          playerID: this.players[0]
        };
      } else {
        this.expectedTurn = {
          type: "bid",
          playerID: this.players[this.players.indexOf(move.playerID) + 1]
        };
      }
    } else {
      card_removed = this.cards[move.playerID].remove(move.value);
      this.table.push(move.value);
      cb();
      if (move.playerID === this.players[this.players.length - 1]) {
        this.concludeTrick();
      } else {
        this.expectedTurn = {
          type: "card",
          playerID: this.players[this.players.indexOf(move.playerID) + 1]
        };
      }
    }
    console.log("--> move successful");
    return cb();
  };

  Game.prototype.concludeTrick = function() {
    var cards, cards_played, suit_led, tricks_played, trumps_played, winner, _base, _name,
      _this = this;
    console.log('concludeTrick');
    cards = this.table;
    winner = null;
    suit_led = cards[0].suit;
    trumps_played = cards.filter(function(card) {
      return card.suit === _this.trumps;
    });
    if (trumps_played.length > 0) {
      winner = max(trumps_played);
    } else {
      cards_played = cards.filter(function(card) {
        return card.suit === suit_led;
      });
      console.log('cards played:');
      console.log(cards_played);
      winner = max(cards_played);
    }
    console.log("winner of trick: ", winner.owner);
    (_base = this.tricks[this.round - 1])[_name = winner.owner] || (_base[_name] = 0);
    this.tricks[this.round - 1][winner.owner] += 1;
    tricks_played = (this.moves[this.round - 1].length / this.playerLimit) - 1;
    if (tricks_played === this.rounds[this.round - 1]) {
      console.log('End of round');
      this.calculateScore();
      this.table = [];
      if (this.round === this.rounds.length) {
        console.log("Game over");
        this.expectedTurn = null;
        this.trigger('end');
      } else {
        this.round++;
        return this.start({
          winner: winner.owner
        });
      }
    } else {
      this.table = [];
      this.players = shift(this.players, this.players.indexOf(winner.owner));
      console.log('new players order', this.players);
      this.expectedTurn = {
        type: "card",
        playerID: this.players[0]
      };
      return console.log("here");
    }
  };

  Game.prototype.calculateScore = function() {
    var bid, bids, playerID, prevScore, score, tricks, _base, _i, _len, _name, _ref, _ref1, _ref2, _results;
    bids = this.moves[this.round - 1].slice(0, this.playerLimit);
    _ref = this.tricks[this.round - 1];
    for (playerID in _ref) {
      tricks = _ref[playerID];
      bid = bids.filter(function(move) {
        return move.playerID === playerID;
      });
      bid = bid[0].value;
      console.log('tricks: ', tricks);
      console.log('bid: ', bid);
      score = 0;
      if (tricks < bid) {
        score = tricks;
      }
      if (tricks === bid) {
        score = tricks + 10;
      }
      if (tricks > bid) {
        score = bid - tricks;
      }
      console.log('score: ', score);
      prevScore = this.scores[playerID];
      if ((_ref1 = (_base = this.scores)[_name = this.round - 1]) == null) {
        _base[_name] = {};
      }
      this.scores[this.round - 1][playerID] = prevScore + score;
      this.scores[playerID] = this.scores[this.round - 1][playerID];
    }
    _ref2 = this.players;
    _results = [];
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      playerID = _ref2[_i];
      _results.push(console.log('player ', playerID, ' score: ', this.scores[playerID]));
    }
    return _results;
  };

  Game.prototype.validateMove = function(move) {
    var prevBids;
    if (move.type === "bid") {
      prevBids = this.moves[this.round - 1];
      if (move.playerID === this.players[this.players.length - 1]) {
        return validateLastBid(move.value, this.rounds[this.round - 1], prevBids);
      } else {
        return validateBid(move.value, this.rounds[this.round - 1]);
      }
    } else if (move.type === "card") {
      return validateCardPlayed(move.value, this.cards[move.playerID], this.trumps, this.table[0] || move.value);
    } else if (move.type === "trumps") {
      if (_.include(["C", "D", "H", "S"], move.value)) {
        return true;
      }
    }
  };

  Game.prototype.deal = function(number) {
    var card, deck, i, p, _i, _j, _k, _len, _len1, _ref, _ref1;
    deck = newDeck();
    _ref = this.players;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      this.cards[p] = [];
    }
    for (i = _j = 1; 1 <= number ? _j <= number : _j >= number; i = 1 <= number ? ++_j : --_j) {
      _ref1 = this.players;
      for (_k = 0, _len1 = _ref1.length; _k < _len1; _k++) {
        p = _ref1[_k];
        card = deck[0];
        card.owner = p;
        this.cards[p].push(card);
        deck.splice(0, 1);
      }
    }
    return console.log('cards dealt', this.cards);
  };


  /*
    Utils
  */

  var shift = function(array, index) {
    return _.rest(array, index).concat(_.first(array, index));
  };

  Array.prototype.remove = function(obj) {
    var removed_obj,
      _this = this;
    removed_obj = null;
    _.each(this, function(o) {
      if (_.isEqual(o, obj)) {
        _this.splice(_this.indexOf(o), 1);
        return removed_obj = o;
      }
    });
    return removed_obj;
  };

  var max = function(cards) {
    var c, card, val, _i, _len;
    card = {
      number: '0'
    };
    var values = {
      'A': 14,
      'K': 13,
      'Q': 12,
      'J': 11,
      '10': 10, 
      '9': 9,
      '8': 8,
      '7': 7,
      '6': 6,
      '5': 5,
      '4': 4,
      '3': 3,
      '2': 2,
      '0': 0
    };
    _.each(cards, function(c) {
      var val = values[c.number];
      if (val > values[card.number]) {
        card = c;
      }
    });
    return card;
  };

  var randomSuit = function() {
    return ["C", "D", "H", "S"][Math.floor(Math.random() * 4)];
  };

  var newDeck = function() {
    var card, deck, i, n, numbers, s, suits, _i, _j, _k, _len, _len1, _len2, _ref;
    deck = [];
    numbers = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    suits = ["C", "D", "H", "S"];
    for (_i = 0, _len = suits.length; _i < _len; _i++) {
      s = suits[_i];
      for (_j = 0, _len1 = numbers.length; _j < _len1; _j++) {
        n = numbers[_j];
        card = {
          suit: s,
          number: n,
          owner: null
        };
        deck.push(card);
      }
    }
    for (i = _k = 0, _len2 = deck.length; _k < _len2; i = ++_k) {
      card = deck[i];
      n = Math.floor(Math.random() * deck.length);
      _ref = [deck[n], deck[i]], deck[i] = _ref[0], deck[n] = _ref[1];
    }
    return deck;
  };

  var validateBid = function(bid, number_of_tricks) {
    return bid >= 0 && bid <= number_of_tricks;
  };

  var validateCardPlayed = function(card, hand, trumps, card_led) {
    if (!containsCard(hand, card)) {
      console.log("card is not in player's hand", card, hand);
      return false;
    }
    if (card.suit === trumps) {
      if (containsSuit(hand, card_led.suit) && card_led.suit !== trumps) {
        console.log("player is able to follow suit but has not");
        return false;
      } else {
        return true;
      }
    }
    if (card.suit === card_led.suit) {
      return true;
    }
    if (containsSuit(hand, card_led.suit)) {
      console.log("player is able to follow suit but has not");
      return false;
    } else {
      return true;
    }
  };

  var validateLastBid = function(bid, number_of_tricks, previousBids) {
    return validateBid(bid, number_of_tricks) && bid !== number_of_tricks - sum(_.pluck(previousBids, 'value'));
  };

  var containsSuit = function(cards, suit) {
    var c, _i, _len;
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      c = cards[_i];
      if (c.suit === suit) {
        return true;
      }
    }
    return false;
  };

  var containsCard = function(cards, card) {
    var c, _i, _len;
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      c = cards[_i];
      if (c.suit === card.suit && c.number === card.number) {
        return true;
      }
    }
    return false;
  };

  var sum = function(array) {
    var t = 0
    for (var i = 0; i < array.length; i++) {
      t += array[i];
    }
    return t;
  };

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.Game = Game;

}).call(this);
