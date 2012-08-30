(function(_, Backbone, $) {
  var cardFile, getState, join, joined, move, playerID, player_name, socket, state, _state;

  socket = io.connect('/');

  playerID = null;

  _state = null;

  joined = false;

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
  })

  /*
    Collections
  */

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
      var trumps = {
        "C": "Clubs",
        "D": "Diamonds",
        "H": "Hearts",
        "S": "Spades"
      };
      var t = trumps[_state.trumps];
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

  var JoinView = Backbone.View.extend({
    events: {
    'click input#join': 'join'      
    },
    join: function(e) {
      var id = this.$('input#name').val();
      if (joined) {
        return;
      }
      playerID = id;
      socket.emit('join', {
        playerID: id
      });
      this.remove();
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

      var joinView = new JoinView({
        el: $('#join')
      });

      socket.on('state', function(data) {
        var e = (data.state.expectedTurn != null) ? data.state.expectedTurn : void 0;
        if (e && e.playerID === playerID && e.type === "trumps") {
          $('#trumps').append(trumpsPickerView.el);
          trumpsPickerView.render();
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
      });
    }
  })

  socket.on('start', function(data) {
    console.log('state received', data);
    return _state = data.state;
  });

  socket.on('state', function(data) {
    console.log('state update', data);
    _state = data.state;
    var _ref;
    if (((_ref = data.state.expectedTurn) != null ? _ref.playerID : void 0) === playerID) {
      console.log('it is your turn');
    }
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

    // $('input#join').bind('click', function() {
    //   return join($('input#name').val());
    // });

  });

  window.playerID = player_name;

  window.state = state;

  window.join = join;

  window.getState = getState;

  window.move = move;

})(_, Backbone, jQuery);
