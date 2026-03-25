const Deck = require('./deck');

class Game {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = [];
        this.deck = new Deck();
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 for forward, -1 for backward
        this.started = false;
        this.winner = null;
        this.currentColor = null;
        this.currentValue = null;
        this.drawStack = 0;
        this.canSkip = false; // True if player just drew a card and can choose to play or skip
    }

    addPlayer(id, name) {
        if (this.players.length >= 4) return false;
        this.players.push({ id, name, hand: [] });
        return true;
    }

    removePlayer(id) {
        const index = this.players.findIndex(p => p.id === id);
        if (index !== -1) {
            this.players.splice(index, 1);
            if (index < this.currentPlayerIndex) {
                this.currentPlayerIndex--;
            } else if (this.currentPlayerIndex >= this.players.length) {
                this.currentPlayerIndex = 0;
            }
        }
    }

    start() {
        if (this.players.length < 2) return false;
        
        this.deck.shuffle();
        
        for (let i = 0; i < 7; i++) {
            this.players.forEach(player => {
                player.hand.push(this.deck.draw());
            });
        }

        let firstCard = this.deck.draw();
        while (firstCard.type !== 'number') {
            this.deck.addCards([firstCard]);
            this.deck.shuffle();
            firstCard = this.deck.draw();
        }
        
        this.discardPile.push(firstCard);
        this.currentColor = firstCard.color;
        this.currentValue = firstCard.value;
        this.started = true;
        
        if (firstCard.value === 'Skip') {
            this.nextTurn();
        } else if (firstCard.value === 'Reverse') {
            this.direction *= -1;
            if (this.players.length === 2) {
                this.nextTurn();
            } else {
                this.currentPlayerIndex = this.players.length - 1;
            }
        } else if (firstCard.value === 'Draw') {
            this.drawStack += 2;
        }

        return true;
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
        this.canSkip = false;
    }

    playCard(playerId, cardIndices, colorSelection = null) {
        const player = this.players[this.currentPlayerIndex];
        if (player.id !== playerId) return { error: "Not your turn" };

        if (!Array.isArray(cardIndices)) cardIndices = [cardIndices];
        
        // Ensure unique, numeric, and valid indices
        const indices = [...new Set(cardIndices)].map(n => parseInt(n)).filter(n => !isNaN(n));
        if (indices.length === 0) return { error: "No cards selected" };

        // Check if all indices are valid and cards have same value
        const cards = indices.map(idx => player.hand[idx]);
        if (cards.some(c => !c)) return { error: "Card not found" };

        const firstCardValue = cards[0].value;
        if (cards.some(c => c.value !== firstCardValue)) {
            return { error: "All played cards must have the same value" };
        }

        // Penalty stack check
        if (this.drawStack > 0) {
            const isDraw2 = cards[0].value === 'Draw';
            const isWild4 = cards[0].type === 'wild-draw-4';
            if (!isDraw2 && !isWild4) {
                return { error: `Must play a stackable draw card or draw ${this.drawStack} cards` };
            }
        }

        // Playability check: At least one card in the stack must be compatible with the current top card
        const compatibleIdx = cards.findIndex(c => 
            c.color === this.currentColor || 
            c.value === this.currentValue || 
            c.color === 'Wild'
        );
        if (compatibleIdx === -1) return { error: "None of the selected cards are compatible with the top card" };

        // Wild card color selection check
        const hasWild = cards.some(c => c.color === 'Wild');
        if (hasWild && !colorSelection) {
            return { status: "need_color_selection" };
        }

        // All good, process the play
        const sortedIndices = [...indices].sort((a, b) => b - a);
        let turnAdvances = 1;

        for (const card of cards) {
            this.discardPile.push(card);
            
            if (card.value === 'Draw') {
                this.drawStack += 2;
            } else if (card.type === 'wild-draw-4') {
                this.drawStack += 4;
            } else if (card.value === 'Skip') {
                turnAdvances++;
            } else if (card.value === 'Reverse') {
                if (this.players.length === 2) {
                    turnAdvances++;
                } else {
                    this.direction *= -1;
                }
            }
        }

        for (const idx of sortedIndices) {
            player.hand.splice(idx, 1);
        }

        const lastCard = cards[cards.length - 1];
        this.currentColor = colorSelection || lastCard.color;
        this.currentValue = lastCard.value;
        if (hasWild) this.currentColor = colorSelection;

        if (player.hand.length === 0) {
            this.winner = player;
            return { status: "won" };
        }

        // Advance turn by accumulated skips + 1
        for (let i = 0; i < turnAdvances; i++) {
            this.nextTurn();
        }

        return { status: "success" };
    }

    drawCard(playerId) {
        const player = this.players[this.currentPlayerIndex];
        if (player.id !== playerId) return { error: "Not your turn" };

        if (this.drawStack > 0) {
            for (let i = 0; i < this.drawStack; i++) {
                let card = this.deck.draw();
                if (!card) {
                    this.handleEmptyDeck();
                    card = this.deck.draw();
                }
                if (card) player.hand.push(card);
            }
            this.drawStack = 0;
            this.nextTurn();
            return { status: "success", drawStackAction: true };
        }

        let newCard = this.deck.draw();
        if (!newCard) {
            this.handleEmptyDeck();
            newCard = this.deck.draw();
        }
        
        if (newCard) player.hand.push(newCard);
        
        // Draw and Play rule: Don't advance turn, but mark as canSkip
        this.canSkip = true;
        return { status: "success", drawnCard: newCard };
    }

    skipTurn(playerId) {
        const player = this.players[this.currentPlayerIndex];
        if (player.id !== playerId) return { error: "Not your turn" };
        if (!this.canSkip) return { error: "Cannot skip now" };

        this.nextTurn();
        return { status: "success" };
    }

    handleEmptyDeck() {
        if (this.discardPile.length <= 1) return;
        const topCard = this.discardPile.pop();
        this.deck.addCards(this.discardPile);
        this.deck.shuffle();
        this.discardPile = [topCard];
    }

    getState(playerId) {
        return {
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                handCount: p.hand.length,
                isCurrentPlayer: this.players[this.currentPlayerIndex]?.id === p.id
            })),
            hand: this.players.find(p => p.id === playerId)?.hand || [],
            topCard: this.discardPile[this.discardPile.length - 1],
            currentColor: this.currentColor,
            currentValue: this.currentValue,
            started: this.started,
            winner: this.winner,
            direction: this.direction,
            currentPlayerIndex: this.currentPlayerIndex,
            drawStack: this.drawStack,
            canSkip: this.canSkip
        };
    }
}

module.exports = Game;
