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
			if move.playerID == @players[@players.length-1] # all players have played a card
				# end round somehow... calc winner and score etc.
				console.log 'end of round not implemented'
			else
				@expectedTurn =
					type: "move"
					playerID: @players[@players.indexOf(move.playerID)+1]
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
  