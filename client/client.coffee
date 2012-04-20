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
	renderHand _state.hand
	renderTable _state.table
	bindHand()
	return

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


join = (ID) ->
	playerID = ID
	socket.emit 'join', {playerID: ID}
getState = () ->
	socket.emit 'state'
move = (move) -> # {type, value}
	move.playerID = playerID
	socket.emit 'move', move
state = () ->
	_state
player_name = () ->
	playerID

# Convert a card into the correct filename
cardFile = (card) ->
	n = switch card.number
		when "A" then 1
		when "K" then 2
		when "Q" then 3
		when "J" then 4
		when "10" then 5
		when "9" then 6
		when "8" then 7
		when "7" then 8
		when "6" then 9
		when "5" then 10
		when "4" then 11
		when "3" then 12
		when "2" then 13
	suit_n = switch card.suit
		when "C" then 1
		when "S" then 2
		when "H" then 3
		when "D" then 4
	filename = 'cards/'+((4*(n-1)) + suit_n)+'.png'

# jQuery bindings
$().ready ->
	$('input#join').bind 'click', () ->
		join $('input#name').val()
	$('input#bid').bind 'click', () ->
		value = $('input#bid_value').val() - 0
		move {type:"bid", value:value}
	$('input#play_card').bind 'click', () ->
		number = $('input#card_number').val()
		suit = $('input#card_suit').val()
		card = {number, suit, owner:playerID}
		move {type:"card", value:card}

bindHand = () ->
	$('.hand').each () ->
		$(@).bind 'click', () ->
			cardName = $(@).attr('id')
			suit = cardName[0]
			number = cardName.slice(1,cardName.length)
			card = {number, suit, owner:playerID}
			move {type:"card", value:card}

renderHand = (hand) ->
	$('#hand').empty()
	for c in hand
		f = cardFile c
		cardName = c.suit + c.number
		$('#hand').append('<img src="'+f+'" class="hand" id="'+cardName+'"></img>')
renderTable = (table) ->
	$('#table').empty()
	for c in table
		f = cardFile c
		$('#table').append('<img src="'+f+'"></img>')

window.playerID = player_name
window.state = state
window.join = join
window.getState = getState
window.move = move