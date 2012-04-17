require "coffee-script"
ioLib = require("socket.io")
fs = require 'fs'
Game = require("../common/game.coffee").Game

# Web server
app = require('http').createServer (req, res) ->
	console.log req.url
	file = null
	if req.url == "/"
		file = '/client/index.html'
	else
		file = req.url
	fs.readFile __dirname + '/..' + file, (err, data) ->
		res.writeHead 200
		res.end data
app.listen 3000, 'localhost'

#SocketIO object
io = ioLib.listen(3030)

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
	 		return
		# Check that it is the client's turn
		if game.expectedTurn? && game.expectedTurn.playerID != playerID
			return
		# Check that the type of move is correct
		if game.expectedTurn? && game.expectedTurn.type != move.type	
			return
		game.makeMove move, () ->
			io.sockets.emit 'state', {state: game.getState(playerID)}

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
			socket.broadcast.emit 'join', data
			data.isme = true
			socket.emit 'join', data

game.on 'start', (data) ->
	console.log 'game started', data
	io.sockets.emit 'gameStart'

game.on 'end', (data) ->
	console.log 'game ended'
	io.sockets.emit 'end'
	# Stop game?
