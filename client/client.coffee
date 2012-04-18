socket = io.connect 'http://localhost:3030'

playerID = null
_state = null

# Get initial game state
socket.on 'start', (data) ->
	console.log 'state received', data
	_state = data.state

socket.on 'state', (data) ->
	console.log 'state update', data
	_state = data.state
	if data.state.expectedTurn?.playerID == playerID
		console.log 'it is your turn'

socket.on 'join', (data) ->
	console.log 'player joined', data
	if data.isme
	  	playerID = data.playerID

socket.on 'move', (data) ->
	console.log 'move made', data

socket.on 'gameStart', () ->
	socket.emit 'state'
	console.log 'game started'

socket.on 'end', () ->
	console.log "Game over"
	socket.emit 'state'


join = (playerID) ->
	socket.emit 'join', {playerID: playerID}
getState = () ->
	socket.emit 'state'
move = (move) -> # {type, value}
	move.playerID = playerID
	socket.emit 'move', move
state = () ->
	_state

window.state = state
window.join = join
window.getState = getState
window.move = move