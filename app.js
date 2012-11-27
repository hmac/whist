(function() {
  var Game, app, fs, game, io, ioLib, num_players, players, port;

  ioLib = require("socket.io");

  fs = require('fs');

  Game = require("./game.js").Game;

  port = process.env.PORT || process.argv[2] || 3000;

  num_players = process.argv[3] - 0 || 2;

  app = require('http').createServer(function(req, res) {
    var file = null;
    if (req.url === "/") {
      file = '/index.html';
    } else {
      file = req.url;
    }
    return fs.readFile(__dirname + file, function(err, data) {
      if (err) {
        console.log(err);
      }
      else {
        fs.stat(__dirname + file, function(err, stat) {
          if (err) {
            res.statusCode = 500;
            res.end();
          }
          else {
            var etag = stat.size + '-' + Date.parse(stat.mtime);
            res.setHeader('Last-Modified', stat.mtime);

            if (req.headers['if-none-match'] === etag) {
              res.statusCode = 304;
              res.end();
            }
            else {
              res.setHeader('Content-Length', data.length);
              res.setHeader('ETag', etag);
              res.statusCode = 200;
              res.end(data);
            }
          }
        });
      }
    });
  });

  io = ioLib.listen(app);

  io.set('log level', 1);

  // io.set("transports", ["xhr-polling"]);

  // io.set("polling duration", 10);

  app.listen(port);

  game = new Game(num_players);

  players = {};

  io.sockets.on('connection', function(socket) {
    var playerID = null;

    socket.on('move', function(move) {
      if (!game.begun) {
        console.log("game has not begun");
        return;
      }
      if ((game.expectedTurn !== null) && game.expectedTurn.playerID !== playerID) {
        console.log("it is not " + playerID + "'s turn");
        return;
      }
      if ((game.expectedTurn !== null) && game.expectedTurn.type !== move.type) {
        console.log("expected move type " + game.expectedTurn.type + ", received " + move.type);
        return;
      }
      return game.makeMove(move, emitState);
    });

    socket.on('state', function(data) {
      return socket.emit('state', {
        state: game.getState(playerID)
      });
    });

    socket.on('join', function(data) {
      console.log('join', data);
      if (game.playerExists(data.playerID)) {
        console.log('name in use: ', data.playerID);
        return;
      }
      if (game.players.length >= game.playerLimit) {
        console.log('number of players has reached game limit');
        return;
      }
      if (!data.playerID || !data.password) {
        console.log("Invalid playerID or password");
        return;
      }
      game.join(data.playerID, function() {
        playerID = data.playerID;
        players[data.playerID] = {
          'socket': socket,
          password: data.password,
          connected: true
        };
        socket.emit('join', {
          playerID: playerID
        });
      });
    });

    socket.on('rejoin', function(data) {
      if (!game.playerExists(data.playerID)) {
        console.log('player does not exist');
        return;
      }
      if (players[data.playerID].password !== data.password) {
        console.log('password incorrect');
        return;
      }
      playerID = data.playerID;
      players[playerID].socket = socket;
      players[playerID].connected = true;
      socket.emit('join', {
        playerID: playerID
      });
    });

    socket.on('disconnect', function() {
      // console.log('socket disconnected: ', socket);
      if (players[playerID]) players[playerID].connected = false;
    });

  });

  game.on('update', function() {
    emitState();
  });

  game.on('start', function() {
    io.sockets.emit('gameStart');
  });

  game.on('end', function() {
    console.log('game ended');
    io.sockets.emit('end');
  });

  var emitState = function() {
    for (var id in players) {
      players[id].socket.emit('state', {
        state: game.getState(id)
      });
    }
  };

}).call(this);
