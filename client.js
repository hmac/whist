(function(_, Backbone, $) {
  var bindHand, cardFile, chooseTrumps, getState, join, joined, move, playerID, player_name, renderHand, renderState, renderTable, showTrumps, socket, state, _state;

  socket = io.connect('/');

  playerID = null;

  _state = null;

  joined = false;

  var Card = Backbone.Model.extend({

  });

  var Player = Backbone.Model.extend({
    parse: function(resp, xhr) {
      return {
        playerID: resp
      };
    }
  })

  var Hand = Backbone.Collection.extend({
    sync: function(method, model, options) {
      _state && options.success(_state.hand);
    },
    initialize: function() {
      var self = this;
      socket.on('state', _.bind(this.fetch, this));
    }
  });

  var Table = Backbone.Collection.extend({
    sync: function(method, model, options) {
      _state && options.success(_state.table)
    },
    initialize: function() {
      var self = this;
      socket.on('state', _.bind(this.fetch, this));
    }
  });

  var Players = Backbone.Collection.extend({
    model: Player,
    sync: function(method, model, options) {
      _state && options.success(_state.players);
    },
    initialize: function() {
      var self = this;
      socket.on('state', _.bind(this.fetch, this));
    }
  });

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
  })

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
    trumps: {'C': 1, 'S': 2, 'H': 3, 'D': 4}, // suits and their filenames
    render: function() {
      var self = this;
      _.each(this.trumps, function(index, trump) {
        var view = new CardView({
          imgsrc: 'cards/'+index+'.png',
          trump: trump,
          events: {
            'click': function() {
              move({
                type: "trumps",
                value: this.trump
              });
              this.trigger('click');
            }
          }
        });
        view.on('click', function(){
          self.remove()
        });
        view.render();
        self.$el.append(view.el);
      });
    }
  });

  var TrumpsView = Backbone.View.extend({
    initialize: function() {
      socket.on('state', _.bind(this.render, this));
    },
    render: function() {
      var t = "";
      switch (_state.trumps) {
        case "C":
          t = "Clubs";
          break;
        case "D":
          t = "Diamonds";
          break;
        case "H":
          t = "Hearts";
          break;
        case "S":
          t = "Spades";
      }
      this.$el.html(t);
    }
  });

  var PlayersView = Backbone.View.extend({
    initialize: function() {
      this.collection.on('reset', _.bind(this.render, this));
    },
    render: function() {
      this.$el.empty();
      var self = this;
      this.collection.each(function(player) {
        var elem = $('<li>'+player.get('playerID')+'</li>');
        self.$el.append(elem);
      });
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

      var trumpsPickerView = new TrumpsPickerView();

      var trumpsView = new TrumpsView({
        el: $('#trumps_display')
      });

      var playersView = new PlayersView({
        collection: new Players(),
        tagName: 'ul'
      });
      $('#players').append(playersView.el);

      var bidView = new BidView({
        el: $('#place_bid')
      });
      bidView.setVisible(false);

      socket.on('state', function(data) {
        var e = (data.state.expectedTurn != null) ? data.state.expectedTurn : void 0;
        if (e && e.playerID === playerID && e.type === "trumps") {
          $('#trumps').append(trumpsPickerView.el);
          trumpsPickerView.render();
        }
        if (e && e.playerID === playerID && e.type === "bid") {
          bidView.setVisible(true);
        }
      });
    }
  })

  socket.on('start', function(data) {
    console.log('state received', data);
    return _state = data.state;
  });

  socket.on('state', function(data) {
    var _ref;
    console.log('state update', data);
    _state = data.state;
    if (((_ref = data.state.expectedTurn) != null ? _ref.playerID : void 0) === playerID) {
      console.log('it is your turn');
      if (data.state.expectedTurn.type === "trumps") {
        // chooseTrumps();
      }
    }
    if (_state.hand) {
      // renderHand(_state.hand);
    }
    // renderTable(_state.table);
    // bindHand();
    // showTrumps();
    // renderState();
  });

  socket.on('join', function(data) {
    console.log('player joined', data);
    if (data.isme) {
      playerID = data.playerID;
      joined = true;
    }
    return socket.emit('state');
  });

  socket.on('move', function(data) {
    return console.log('move made', data);
  });

  socket.on('gameStart', function() {
    return socket.emit('state');
  });

  socket.on('end', function() {
    console.log("Game over");
    return socket.emit('state');
  });

  socket.on('update', function() {
    return socket.emit('state');
  });

  join = function(ID) {
    if (joined) {
      return;
    }
    playerID = ID;
    return socket.emit('join', {
      playerID: ID
    });
  };

  getState = function() {
    return socket.emit('state');
  };

  move = function(move) {
    move.playerID = playerID;
    return socket.emit('move', move);
  };

  state = function() {
    return _state;
  };

  player_name = function() {
    return playerID;
  };

  cardFile = function(card) {
    var filename, n, suit_n;
    n = (function() {
      switch (card.number) {
        case "A":
          return 1;
        case "K":
          return 2;
        case "Q":
          return 3;
        case "J":
          return 4;
        case "10":
          return 5;
        case "9":
          return 6;
        case "8":
          return 7;
        case "7":
          return 8;
        case "6":
          return 9;
        case "5":
          return 10;
        case "4":
          return 11;
        case "3":
          return 12;
        case "2":
          return 13;
      }
    })();
    suit_n = (function() {
      switch (card.suit) {
        case "C":
          return 1;
        case "S":
          return 2;
        case "H":
          return 3;
        case "D":
          return 4;
      }
    })();
    return filename = 'cards/' + ((4 * (n - 1)) + suit_n) + '.png';
  };

  $().ready(function() {

    var app = new App();


    var filename, n, suit, _i, _results;
    $('input#join').bind('click', function() {
      return join($('input#name').val());
    });
    // $('input#bid').bind('click', function() {
    //   var value;
    //   value = $('input#bid_value').val() - 0;
    //   return move({
    //     type: "bid",
    //     value: value
    //   });
    // });
    // $('input#play_card').bind('click', function() {
    //   var card, number, suit;
    //   number = $('input#card_number').val();
    //   suit = $('input#card_suit').val();
    //   card = {
    //     number: number,
    //     suit: suit,
    //     owner: playerID
    //   };
    //   return move({
    //     type: "card",
    //     value: card
    //   });
    // });
    // $('#trumps').css('display', 'none');
    // for (n = _i = 1; _i <= 4; n = ++_i) {
    //   filename = 'cards/' + n + '.png';
    //   suit = ["C", "S", "H", "D"][n - 1];
    //   $('#trumps').append('<img class="trumpschoice" id="' + suit + '" src="' + filename + '"></img>');
    // }
  });

  // chooseTrumps = function() {
  //   $('.trumpschoice').each(function() {
  //     return $(this).bind('click', function() {
  //       var suit;
  //       suit = $(this).attr('id');
  //       move({
  //         type: "trumps",
  //         value: suit
  //       });
  //       return $('#trumps').css('display', 'none');
  //     });
  //   });
  //   return $('#trumps').css('display', '');
  // };

  // bindHand = function() {
  //   return $('.hand').each(function() {
  //     return $(this).bind('click', function() {
  //       var card, cardName, number, suit;
  //       cardName = $(this).attr('id');
  //       suit = cardName[0];
  //       number = cardName.slice(1, cardName.length);
  //       card = {
  //         number: number,
  //         suit: suit,
  //         owner: playerID
  //       };
  //       return move({
  //         type: "card",
  //         value: card
  //       });
  //     });
  //   });
  // };

  // renderTable = function(table) {
  //   var c, f, _i, _len, _results;
  //   $('#table').empty();
  //   _results = [];
  //   for (_i = 0, _len = table.length; _i < _len; _i++) {
  //     c = table[_i];
  //     f = cardFile(c);
  //     _results.push($('#table').append('<img src="' + f + '"></img>'));
  //   }
  //   return _results;
  // };

  // renderState = function() {
  //   var i, name, obj, p, players, score, table, template, tricks, turn, _i, _len, _ref, _ref1, _ref2;
  //   if (!(_state.expectedTurn != null) || !(_state.score != null)) {
  //     return;
  //   }
  //   players = [];
  //   _ref = _state.players;
  //   for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
  //     p = _ref[i];
  //     if (_state.expectedTurn.playerID === p) {
  //       turn = true;
  //     } else {
  //       turn = false;
  //     }
  //     name = p;
  //     tricks = ((_ref1 = _state.tricks[_state.round - 1]) != null ? _ref1[p] : void 0) || 0;
  //     score = ((_ref2 = _state.score[_state.round - 1]) != null ? _ref2[p] : void 0) || 0;
  //     turn = turn;
  //     obj = {
  //       name: name,
  //       tricks: tricks,
  //       score: score,
  //       turn: turn
  //     };
  //     players.push(obj);
  //   }
  //   template = $('#state_template').html();
  //   table = _.template(template, players);
  //   return $('#state.').html(table);
  // };

  // showTrumps = function() {
  //   var t;
  //   switch (_state.trumps) {
  //     case "C":
  //       t = "Clubs";
  //       break;
  //     case "D":
  //       t = "Diamonds";
  //       break;
  //     case "H":
  //       t = "Hearts";
  //       break;
  //     case "S":
  //       t = "Spades";
  //   }
  //   return $('#trumps_display').html(t);
  // };

  window.playerID = player_name;

  window.state = state;

  window.join = join;

  window.getState = getState;

  window.move = move;

})(_, Backbone, jQuery);
