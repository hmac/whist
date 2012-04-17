socket = io.connect 'http://localhost:3030'

game = new Game()
playerID = null

# Get initial game state
socket.on 'start', (data) ->
	console.log 'state received', data

socket.on 'state', (data) ->
	console.log 'state update', data
	# game.updateState
	if data.state.expectedTurn? && data.state.expectedTurn.playerID == playerID
		console.log 'it is your turn'

socket.on 'join', (data) ->
	console.log 'player joined', data
	game.join(data.playerID)
	if data.isme
	  	playerID = data.playerID

socket.on 'move', (data) ->
	console.log 'move made', data

socket.on 'gameStart', () ->
	socket.emit 'state'
	console.log 'game started'


join = (playerID) ->
	socket.emit 'join', {playerID: playerID}
getState = () ->
	socket.emit 'state'
move = (move) -> # {type, value}
	move.playerID = playerID
	socket.emit 'move', move

window._game = game
window.join = join
window.getState = getState
window.move = move