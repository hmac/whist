require "coffee-script"
ioLib = require("socket.io")
fs = require 'fs'
Game = require("../common/game.coffee").Game

port = process.argv[2] || 3000

# Web server
app = require('http').createServer (req, res) ->
	console.log req.url
	file = null
	if req.url == "/"
		file = '/client/index.html'
	else
		file = req.url
	fs.readFile __dirname + '/..' + file, (err, data) ->
		console.log err if err
		res.writeHead 200
		res.end data

# SocketIO object
io = ioLib.listen(app)
io.set('log level', 3)
# To get heroku to work
io.set("transports", ["xhr-polling"]); 
io.set("polling duration", 10);

app.listen port

# Create new game
game = new Game(2) # playerLimit = 2

players = []

io.sockets.on 'connection', (socket) ->
	console.log 'connection made'
	# Keep track of player assoc with this socket
	playerID = null

	# When client connects, dump game state
	socket.emit 'start', {
		state: game.getState(playerID)
	}

	# Client makes move
	socket.on 'move', (move) ->
		console.log 'move', move
		# Check the game has begun
		if !game.begun
			console.log "game has not begun"
			return
		# Check that it is the client's turn
		if game.expectedTurn? && game.expectedTurn.playerID != playerID
			console.log "it is not "+playerID+"'s turn"
			return
		# Check that the type of move is correct
		if game.expectedTurn? && game.expectedTurn.type != move.type
			console.log "expected move type "+game.expectedTurn.type+", received "+move.type
			return
		game.makeMove move, () ->
			for p in players
				p.socket.emit 'state', {state: game.getState(p.playerID)}

	# Client asks for game state
	socket.on 'state', (data) ->
		socket.emit 'state', {state: game.getState(playerID)}

	socket.on 'join', (data) ->
		console.log 'join', data
		if game.playerExists data.playerID
			return
		if game.players.length >= game.playerLimit
			return
		console.log 'player joining: '+data.playerID
		game.join data.playerID, () ->
			playerID = data.playerID
			players.push {'playerID':data.playerID, 'socket':socket}
			socket.broadcast.emit 'join', data
			data.isme = true
			socket.emit 'join', data

game.on 'update', () ->
	io.sockets.emit 'update'

game.on 'start', () ->
	io.sockets.emit 'gameStart'

game.on 'end', () ->
	console.log 'game ended'
	io.sockets.emit 'end'
	
