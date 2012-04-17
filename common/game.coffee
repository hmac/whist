require 'validation'

class Game
	constructor: (@playerLimit) ->
		@players = []
		@table = []
		@trumps = ""
		@moves = []
		@phase = "bid"
		@expectedTurn = null
		@scores = {}
		@begun = false
		@callbacks = []
		@cards = {}
		t = Math.floor(52/@playerLimit)
		@rounds = [7..t].concat [t-1..1]
		@round = 1
	on: (event, cb) ->
		@callbacks[event] = cb
	getState: (playerID) ->
		state =
			table: @table
			trumps: @trumps
			expectedTurn: @expectedTurn
			phase: @phase
			round: @round
			players: @players
			hand: @cards[playerID]
	join: (playerID, cb) ->
		@players.push(playerID)
		@scores[playerID] = 0
		cb?()
		if @players.length == @playerLimit
			@start()
	playerExists: (playerID) ->
		return @players.indexOf(playerID) != -1
	start: ->
		@begun = true
		@deal(@rounds[@round-1])
		@trumps = randomSuit()
		@expectedTurn = 
			type: "bid"
			playerID: @players[0]
		@callbacks['start'](@expectedTurn)
	# Callback system
	callback: (event, data) ->
		callback = @callbacks[event]
		if callback
			callback(data)
		else
			throw "No callback defined for "+event
	makeMove: (move, cb) ->
		unless move.type == @expectedTurn.type and move.playerID == @expectedTurn.playerID
			return
		if !(@validateMove move)
			console.log "invalid move"
			return
		@moves[@round-1] ||= []
		@moves[@round-1].push(move)
		if move.type == 'bid'
			if move.playerID == @players[@players.length-1] # all players have bid
				@expectedTurn =
					type: "card"
					playerID: @players[0]
			else
				@expectedTurn =
					type: "bid"
					playerID: @players[@players.indexOf(move.playerID)+1]
		else
		@cards[move.playerID].splice(@cards[move.playerID].indexOf(move.value),1) # Remove card from player's hand
			if move.playerID == @players[@players.length-1] # all players have played a card
				# end trick somehow... calc winner and score etc.
				console.log 'end of trick not implemented'
			else
				@expectedTurn =
					type: "move"
					playerID: @players[@players.indexOf(move.playerID)+1]
		cb()
	concludeTrick: () ->
		# Get the top (number of players) cards from @moves e.g. for 4 players, get top 4 cards
		# These will be the cards played in the trick that we are concluding
		cards = @moves.slice(@moves.length-@playerLimit)
		# Now we need to work out who won...
		winner = null
		suit_led = cards[0].suit
		# Check if there were any trumps played (they will immediately win)
		if trumps_played.length > 0
			# Find the highest of the trumps
			trumps_played = cards.filter (card) ->
				card.suit == @trumps
			winner = max(trumps_played)
		else # No trumps were played, so find the highest of the cards of the led suit
			cards_played = cards.filter (card) ->
				card.suit == suit_led
			winner = max(cards_played)
		# Now we need to do scoring based on this. I haven't implemented any scoring yet...
		# The good news is that that winner-finding algorithm is significantly shorter than the last two I remember writing!
	validateMove: (move) ->
		if move.type == "bid"
			# Get previous bids
				prevBids = []
				for move in @moves[@round-1]
					a.push move.value
			if move.playerID == @players[@players.length-1] # all players have bid
				return validateLastBid move.value, @rounds[@round-1], prevBids
			else
				return validateBid move.value, @rounds[@round-1]
		else return validateCardPlayed move.value, @cards[move.playerID], @trumps, @table[0]
	deal: (number) ->
		deck = newDeck()
		for p in @players
			@cards[p] = []
		for i in [1..number]
			for p in @players
				card = deck[0]
				card.owner = p
				@cards[p].push card
				deck.splice 0, 1
		console.log 'cards dealt', @cards

# Helper functions

# Returns greatest of the cards given (Ace high). Must be of the same suit.
max = (cards) ->
	card = {value: 0}
	for c in cards
		card = c if c.value > card.value
	return card

# Returns a random suit
randomSuit = () ->
	return ["C", "D", "H", "S"][Math.floor Math.random()*4]

# Produces a new, shuffled deck.
newDeck = () ->
	deck = []
	numbers = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
	suits = ["C", "D", "H", "S"]
	for s in suits
		for n in numbers
			card = {suit: s, number: n, owner:null}
			deck.push card
	for card, i in deck
		n = Math.floor Math.random()*deck.length
		[deck[i], deck[n]] = [deck[n], deck[i]]
	return deck


# Export Game
root = exports ? this
root.Game = Game
  