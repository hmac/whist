_ = require("underscore")._ # Bind all the Underscore.js functions to _ (node uses _)

class Game
	constructor: (@playerLimit) ->
		@tricks = {} # A tally of how many tricks each player has won in the round e.g. @tricks[playerID] --> 2
		@scores = [] # An array of objects showing cumulative score for each round. e.g. @scores[@round-1] --> {playerID: score, playerID: score, ..}
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
			scores: @scores
			tricks: @tricks
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
		console.log 'makeMove'
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
			console.log 'cards: ', @cards[move.playerID]
			console.log 'card: ', move.value
			card_removed = @cards[move.playerID].remove(move.value) # Remove card from player's hand
			console.log "card removed: ", card_removed
			@table.push(move.value) # Add card to @table -- move.value must be of the form {number, suit, owner}
			if move.playerID == @players[@players.length-1] # all players have played a card
				# end trick somehow... calc winner and score etc.
				@concludeTrick()
			else
				console.log 'trick not ended'
				@expectedTurn =
					type: "card"
					playerID: @players[@players.indexOf(move.playerID)+1]
		cb()
	concludeTrick: () ->
		console.log 'concludeTrick'
		# Get the cards played in the trick that we are concluding
		cards = @table
		# Now we need to work out who won...
		winner = null
		suit_led = cards[0].suit
		# Check if there were any trumps played (they will immediately win)
		trumps_played = cards.filter (card) ->
			card.suit == @trumps
		if trumps_played.length > 0
			# Find the highest of the trumps
			winner = max(trumps_played)
		else # No trumps were played, so find the highest of the cards of the led suit
			cards_played = cards.filter (card) ->
				card.suit == suit_led
			winner = max(cards_played)
		# Work out how many tricks have been played
		tricks_played = (@moves[@round-1].length/@playerLimit)-1 # -1 because 4 moves at the start are bids
		if tricks_played == @rounds[@round-1] # This is the last trick
			# Calculate and record scores
			@calculateScore()
			# Reset stuff and start the new round
			@table = []
			# Check if this is the last round
			if @round == @rounds.length
				# Indicate the game is over
				console.log "Game over"
				@expectedTurn = null
				@callbacks['end']() # Call the 'end' callback
			else
				# Start the next round
				@round++
				@start()
		else
			console.log "winner of trick: ", winner.owner
			# Note the winner of this trick, reset the table, and start the next trick
			@tricks[winner.owner] ||= 0 # Initialise the trick count if it hasn't been created yet
			@tricks[winner.owner] += 1 # Increment it
			# Reset the table and set the expectedMove
			@table = []
			@expectedMove =
				type: "card"
				playerID: @players[0] # This should be winner.owner, but we haven't implemented rotation yet
	calculateScore: () ->
		# Get the bids
		bids = @moves[@round-1].slice(0, @playerLimit) # Bids = first [number of players] moves in the round
		# SCORE: (tricks < bid) = tricks; (tricks == bid) = tricks+10; (tricks > bid) = bid - tricks;
		for playerID, tricks of @tricks
			bid = bids.filter (move) ->
				move.playerID == playerID
			score = 0
			score = tricks if tricks < bid
			score = tricks + 10 if tricks == bid
			score = bid - tricks if tricks > bid
			# Set prevScore to score of previous round if it exists, else set to 0
			prevScore = if @scores[@round-2]? then @scores[@round-2][playerID] else 0
			# Total score = score from previous round + score from this round
			@scores[@round-1][playerID] = prevScore + score
	validateMove: (move) ->
		if move.type == "bid"
			# Get previous bids
			prevBids = @moves[@round-1] # The only moves made so far are bids so this is safe
			if move.playerID == @players[@players.length-1] # all players have bid
				return validateLastBid move.value, @rounds[@round-1], prevBids
			else
				return validateBid move.value, @rounds[@round-1]
		else return validateCardPlayed move.value, @cards[move.playerID], @trumps, (@table[0] || move.value)
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

# Removes all objects in the array that are equal to obj, using Underscore's deep comparison. Returns the last of those objects.
Array::remove = (obj) ->
	removed_obj = null
	_.each @, (o) =>
		if _.isEqual o, obj
			@.splice (@.indexOf o), 1
			removed_obj = o
	removed_obj

# Returns greatest of the cards given (Ace high). Must be of the same suit.
max = (cards) ->
	card = {number: 0}
	for c in cards
		val = switch c.number
			when "A" then 14
			when "K" then 13
			when "Q" then 12
			when "J" then 11
			else c.number
		card = c if c.number > card.number
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

# Validation functions

validateBid = (bid, number_of_tricks) ->
	return (bid > 0 && bid < number_of_tricks)
validateCardPlayed = (card, hand, trumps, card_led) -> # NOTE: the order of these conditionals is important, don't move them about.
	if !containsCard(hand, card)
		console.log "card is not in player's hand", card, hand
		return false
	if card.suit == trumps
		if containsSuit(hand, card_led.suit) && card_led.suit != trumps
			console.log "player is able to follow suit but has not"
			return false
		else 
			return true
	if card.suit == card_led.suit
		return true
	if containsSuit(hand, card_led.suit)
		console.log "player is able to follow suit but has not"
		return false
	else
		return true
validateLastBid = (bid, number_of_tricks, previousBids) ->
	return (validateBid(bid, number_of_tricks) && bid != number_of_tricks - sum(previousBids))
containsSuit = (cards, suit) ->
	for c in cards
		return true if c.suit == suit
	return false
containsCard = (cards, card) ->
	for c in cards
		return true if c.suit == card.suit and c.number == card.number
	return false
sum = (array) ->
	t = 0
	for n in array
		t += n
	return t

# Export Game
root = exports ? this
root.Game = Game
  