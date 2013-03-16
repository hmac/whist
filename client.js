(function(_, Backbone, $) {

  var socket = io.connect('/');

  var playerID = null;

  var _state = {
    expectedTurn: null,
    hand:         [],
    moves:        [],
    playerLimit:  null,
    players:      [],
    round:        null,
    scores:       {},
    table:        [],
    tricks:       [],
    trumps:       null
  };
  _.extend(_state, Backbone.Events);
  _state.set = function(state) {
    _.extend(this, state);
    this.trigger('change');
  };

  /*
    Models
  */

  var Card = Backbone.Model.extend({

  });

  var Player = Backbone.Model.extend({
    parse: function(resp, xhr) {
      return {
        playerID: resp
      };
    }
  });

  /*
    Collections
  */

  var Hand = Backbone.Collection.extend({
    sync: function(method, model, options) {
      options.success(_state.hand);
    },
    initialize: function() {
      _state.on('change', _.bind(this.fetch, this));
    }
  });

  var Table = Backbone.Collection.extend({
    sync: function(method, model, options) {
      if (_state) {
      options.success(_state.table);
      }
    },
    initialize: function() {
      var self = this;
      _state.on('change', _.bind(this.fetch, this));
    }
  });

  /*
    Views
  */

  var CardListView = Backbone.View.extend({
    initialize: function() {
      this.collection.on('reset', this.render, this);
    },
    render: function() {
      this.$el.empty();
      var el = this.$el;
      this.collection.each(function(card) {
        var file = cardFile({number: card.get('number'), suit: card.get('suit')});
        var cardName = card.get('suit') + card.get('number');
        el.append('<img src="'+file+'" class="hand" id="'+cardName+'"></img>');
      });
    }
  });

  var HandView = CardListView.extend({
    render: function() {
      this.$el.empty();
      var el = this.$el;
      this.collection.each(function(card) {
        var view = new CardView({
          model: card,
          events: {
            'click': function() {
              move({
                type: 'card',
                value: this.model.toJSON()
              });
            }
          }
        });
        view.render();
        el.append(view.el);
      });
    }
  });

  var CardView = Backbone.View.extend({
    tagName: 'img',
    initialize: function(options) {
      this.delegateEvents(options.events);
      this.imgsrc = options.imgsrc;
      this.trump = options.trump;
    },
    render: function() {
      this.$el.attr('class', 'hand');
      if (this.model) {
        var src = cardFile({number: this.model.get('number'), suit: this.model.get('suit')});
        var id = this.model.get('suit') + this.model.get('number');
        this.$el.attr('src', src);
        this.$el.attr('id', id);
      }
      else {
        this.$el.attr('src', this.imgsrc);
      }
    }
  });

  var TrumpsPickerView = Backbone.View.extend({
    events: {
      'click img': 'pickTrumps'
    },
    pickTrumps: function(e) {
      var trump = e.target.id;
      move({
        type: "trumps",
        value: trump
      });
      this.setVisible(false);
    },
    setVisible: function(vis) {
      var disp = vis ? "block" : "none";
      this.$el.css('display', disp);
    }
  });

  var TrumpsView = Backbone.View.extend({
    initialize: function() {
      _state.on('change', _.bind(this.render, this));
    },
    render: function() {
      if (!_state.trumps) {
        return;
      }
      this.$el.css('display', 'block');
      var trumps = {
        "C": "Clubs",
        "D": "Diamonds",
        "H": "Hearts",
        "S": "Spades"
      };
      var t = trumps[_state.trumps];
      this.$el.html("Trumps are "+t);
    }
  });

  var BidView = Backbone.View.extend({
    events: {
      'click .btn': 'placeBid'
    },
    placeBid: function(e) {
      var val = e.target.value - 0;
      move({
        type: "bid",
        value: val
      });
      this.setVisible(false);
    },
    setVisible: function(vis) {
      var disp = vis ? "block" : "none";
      this.$el.css('display', disp);
    }
  });

  var StateView = Backbone.View.extend({
    initialize: function(options) {
      this.template = _.template($('#state_template').html());
      _state.on('change', _.bind(this.render, this));
    },
    render: function() {
      var players = [];
      var tricks = _state.tricks[_state.tricks.length-1];
      _.each(_state.players, function(playerID) {
        var p = {
          playerID: playerID,
          score: _state.scores[playerID],
          tricks: tricks && tricks[playerID] ? tricks[playerID] : 0,
          turn: _state.expectedTurn && _state.expectedTurn.playerID === playerID ? true : false
        };
        players.push(p);
      });
      this.$el.html(this.template({
        players: players
      }));
    }
  });

  var AuthView = Backbone.View.extend({
    events: {
      'click #auth-submit': 'login',
      'click #auth-new-submit': 'createNew'
    },
    initialize: function() {
      var self = this;
      var el = this.$el;
      this.$('#auth-alert').css('display', 'none');
      socket.on('join', function(data) {
        // Return if user is already joined
        if (playerID !== null) {return;}

        self.$('#auth-alert').css('display', 'none');
        self.$('#auth-alert').html('');

        if (data.hasOwnProperty('playerID')) {
          playerID = data.playerID;
          el.modal('hide');
          socket.emit('state');
        }
        else {
          self.$('#auth-alert').html(data.error);
          self.$('#auth-alert').css('display','block');
        }
      });
      this.$el.modal();
    },
    login: function() {
      var id = this.$('#auth-user').val();
      var pass = this.$('#auth-pass').val();

      socket.emit('rejoin', {
        playerID: id,
        password: pass
      });
    },
    createNew: function() {
      var id = this.$('#auth-new-user').val();
      var pass = this.$('#auth-new-pass').val();

      socket.emit('join', {
        playerID: id,
        password: pass
      });
    }
  });

  var BidsView = Backbone.View.extend({
    initialize: function() {
      this.template = _.template($('#bids_template').html());
      _state.on('change', _.bind(this.render, this));
    },
    render: function() {
      var res = [];
      _.each(_state.moves, function(m, j) {
        res[j] = {};
        for (var i = 0; i < _state.players.length; i++) {
          if (_state.moves[j][i]) {
            var bid = _state.moves[j][i];
            var obj = res[j][bid.playerID] = {};
            obj.bid = bid.value;
          }
        }
      });
      var keys = _.filter(_.keys(_state.scores), function(k) { return !_.include(_state.players, k) } );
      _.each(keys, function(key) {
        _.each(_state.players, function(p) {
          res[key][p].score = _state.scores[key][p]
        });
      });
      this.$el.html(this.template({
        data: res,
        players: _state.players
      }));
    }
  });

  /*
    Main App View
  */

  var App = Backbone.View.extend({
    initialize: function() {
      var handView = new HandView({
        collection: new Hand(),
        el: $('#hand')
      });

      var tableView = new CardListView({
        collection: new Table(),
        el: $('#table')
      });

      var trumpsPickerView = new TrumpsPickerView({
        el: $('#trumps')
      });

      var trumpsView = new TrumpsView({
        el: $('#trumps-alert')
      });

      var bidView = new BidView({
        el: $('#place_bid')
      });
      bidView.setVisible(false);

      var stateView = new StateView({
        el: $('#state')
      });

      var authView = new AuthView({
        el: $('#auth')
      });

      var bidsView = new BidsView({
        el: $('#bids')
      });

      socket.on('state', function(data) {
        var e = (data.state.expectedTurn != null) ? data.state.expectedTurn : void 0;
        if (e && e.playerID === playerID && e.type === "trumps") {
          trumpsPickerView.setVisible(true);
        }
        if (e && e.playerID === playerID && e.type === "bid") {
          bidView.setVisible(true);
        }
        if (e && e.playerID === playerID) {
          $('#turn').css('display', 'block');
        }
        else {
          $('#turn').css('display', 'none');
        }
        if (e) {
          $('#round').html('Round '+_state.round);
          $('#round').css('display', 'block');
        }
      });
    }
  });

  /*
    Socket.IO Events
  */

  socket.on('state', function(data) {
    if (data.state.moves.length !== 0) {
      var moves = data.state.moves[data.state.round-1];
      if (data.state.table.length === 0 && data.state.moves.length !== 0 && moves[moves.length-1].type == "card") {
        // Move is ending trick, so wait a bit before clearing everything so players can see the last card played.
        console.log("ending trick");
        window.setTimeout(function() {_state.set(data.state);}, 3000);
        return;
      }
    }
    _state.set(data.state);
  });

  socket.on('end', function() {
    console.log("Game over");
    socket.emit('state');
  });

  move = function(move) {
    move.playerID = playerID;
    return socket.emit('move', move);
  };

  cardFile = function(card) {
    var numbers = {
      "A": 1,
      "K": 2,
      "Q": 3,
      "J": 4,
      "10": 5,
      "9": 6,
      "8": 7,
      "7": 8,
      "6": 9,
      "5": 10,
      "4": 11,
      "3": 12,
      "2": 13
    };
    var n = numbers[card.number];
    var suits = {
      "C": 1,
      "S": 2,
      "H": 3,
      "D": 4
    };
    var suit_n = suits[card.suit];
    return 'cards/' + ((4 * (n - 1)) + suit_n) + '.png';
  };

  $().ready(function() {

    var app = new App();

  });

  window.state = function() { return _state };

})(_, Backbone, jQuery);
