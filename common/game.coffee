require 'validation'

class Game
	constructor: (@playerLimit) ->
		@scores = []
		@players = []
		@table = [] # Cards currently 'on table' -- the ones in the current trick
		@trumps = ""
		@moves = [] # Moves made - both bids and cards. Contains an array for each round.
		@phase = "bid"
		@expectedTurn = null # The player and type of move expected. Used by clients to find out whose turn it is.
		@scores = {} # Scores. A property for each player i.e. @scores[playerID]
		@begun = false # Has game begun
		@callbacks = [] # In order to be able to do "Game.on 'event', handler () ->". Not sure if this is necessary.
		@cards = {} # The hands of each player. Access like @cards[playerID].
		t = Math.floor(52/@playerLimit)
		@rounds = [7..t].concat [t-1..1] # The number of cards to deal in each round i.e. 7,8,9,10,9,8,7,6...
		@round = 1 # The current round
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
	on: (event, cb) ->
		@callbacks[event] = cb
	makeMove: (move, cb) ->
		unless move.type == @expectedTurn.type and move.playerID == @expectedTurn.playerID
			return
		if !(@validateMove move)
			console.log "invalid move"
			return
		@moves[@round-1] ||= []
		@moves[@round-1].push(move) # Add move to moves list
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
			@table.push(move.value) # Add card to @table -- move.value must be of the form {number, suit, owner}
			if move.playerID == @players[@players.length-1] # all players have played a card
				# end trick somehow... calc winner and score etc.
				console.log 'end of trick not implemented'
			else
				@expectedTurn =
					type: "move"
					playerID: @players[@players.indexOf(move.playerID)+1]
		cb()
	concludeTrick: () ->
		# Get the cards played in the trick that we are concluding
		cards = @table
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
		# Work out how many tricks have been played
		tricks_played = (@moves[@round-1].length/@playerLimit)-1 # -1 because 4 moves at the start are bids
		if tricks_played == @rounds[@round-1] # This is the last trick
			# Now we need to do scoring based on this. I haven't implemented any scoring yet...
			calculateScore()
		else

			# Note the winner of this trick, reset the table, and start the next trick
	calculateScore: () ->
		# Get the bids

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
  