class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
    }

    initialize() {
        const colors = ['Blue', 'Green', 'Red', 'Yellow'];
        const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Draw', 'Reverse', 'Skip'];

        for (const color of colors) {
            for (const value of values) {
                const count = value === '0' ? 1 : 2;
                for (let i = 0; i < count; i++) {
                    const type = (value === 'Draw' || value === 'Reverse' || value === 'Skip') ? 'action' : 'number';
                    this.cards.push({ 
                        color, 
                        value, 
                        type, 
                        image: `${color}_${value}.png` 
                    });
                }
            }
        }

        // Add Wild cards
        for (let i = 0; i < 4; i++) {
            this.cards.push({ 
                color: 'Wild', 
                value: 'Wild', 
                type: 'wild', 
                image: 'Wild.png' 
            });
            this.cards.push({ 
                color: 'Wild', 
                value: 'Draw4', 
                type: 'wild-draw-4', 
                image: 'Wild_Draw.png' 
            });
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }

    addCards(cards) {
        this.cards.push(...cards);
    }
}

module.exports = Deck;
