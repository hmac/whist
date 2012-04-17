validateBid = (bid, number_of_tricks) ->
	return (bid > 0 && bid < number_of_tricks)
validateCardPlayed = (card, hand, trumps, card_led) ->
	if card.suit == trumps
		if containsSuit(hand, card_led.suit)
			return false
		else 
			return true
	if card.suit == card_led.suit
		return true
	if containsSuit(hand, card_led.suit)
		return false
	else
		return true
validateLastBid = (bid, number_of_tricks, previousBids) ->
	return (validateBid(bid, number_of_tricks) && bid != number_of_tricks - sum(previousBids))
containsSuit = (cards, suit) ->
	for c in cards
		return true if c.suit == suit
	return false
sum = (array) ->
	t = 0
	for n in array
		t += n
	return t

# Export functions
root = exports ? this

root.validateBid = validateBid
root.validateCardPlayed = validateCardPlayed
root.validateLastBid = validateLastBid