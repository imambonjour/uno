const socket = io();

// UI Elements
const lobby = document.getElementById('lobby');
const gameRoom = document.getElementById('game-room');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const roomDisplay = document.getElementById('room-display');
const handContainer = document.getElementById('hand-container');
const opponentsContainer = document.getElementById('opponents');
const topCardImg = document.getElementById('top-card');
const discardPile = document.getElementById('discard-pile');
const drawCardBtn = document.getElementById('draw-card');
const turnIndicator = document.getElementById('turn-indicator');
const colorPicker = document.getElementById('color-picker');
const gameOverModal = document.getElementById('game-over');
const winnerText = document.getElementById('winner-text');
const selectedInfo = document.getElementById('selected-info');
const selectedCount = document.getElementById('selected-count');

let currentRoomId = '';
let myId = '';
let isMyTurn = false;
let selectedIndices = [];
let currentHand = [];

// Join Room
joinBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    
    if (playerName && roomId) {
        currentRoomId = roomId;
        socket.emit('joinRoom', { roomId, playerName });
        myId = socket.id;
    }
});

// Start Game
startBtn.addEventListener('click', () => {
    socket.emit('startGame', currentRoomId);
});

// Draw Card
drawCardBtn.addEventListener('click', () => {
    if (isMyTurn) {
        socket.emit('drawCard', currentRoomId);
        selectedIndices = [];
        updateSelectedUI();
    }
});

// Skip Turn
skipBtn.addEventListener('click', () => {
    if (isMyTurn) {
        socket.emit('skipTurn', currentRoomId);
        selectedIndices = [];
        updateSelectedUI();
    }
});

// Play Selected (Clicking discard pile)
discardPile.addEventListener('click', () => {
    if (isMyTurn && selectedIndices.length > 0) {
        socket.emit('playCard', { 
            roomId: currentRoomId, 
            cardIndices: selectedIndices 
        });
    }
});

// Socket Events
socket.on('roomUpdate', (gameState) => {
    lobby.classList.add('hidden');
    gameRoom.classList.remove('hidden');
    roomDisplay.innerText = `Room: ${currentRoomId}`;
    
    if (!gameState.started && gameState.players[0].id === socket.id && gameState.players.length >= 2) {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }

    renderOpponents(gameState.players);
});

socket.on('gameStarted', (roomId) => {
    startBtn.classList.add('hidden');
});

socket.on('gameState', (gameState) => {
    renderGame(gameState);
});

socket.on('error', (msg) => {
    alert(msg);
});

socket.on('needColorSelection', (cardIndices) => {
    selectedIndices = cardIndices;
    colorPicker.classList.remove('hidden');
});

socket.on('gameOver', (winner) => {
    winnerText.innerText = `${winner.name} Wins!`;
    gameOverModal.classList.remove('hidden');
});

// Color Selection
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        socket.emit('playCard', { 
            roomId: currentRoomId, 
            cardIndices: selectedIndices, 
            colorSelection: color 
        });
        colorPicker.classList.add('hidden');
        selectedIndices = [];
        updateSelectedUI();
    });
});

function renderGame(state) {
    isMyTurn = state.players[state.currentPlayerIndex].id === socket.id;
    currentHand = state.hand;
    
    // Reset selection if it's no longer our turn and we haven't selected anything
    if (!isMyTurn) {
        selectedIndices = [];
    }

    // Update top card
    if (state.topCard) {
        topCardImg.src = `/assets/${state.topCard.image}`;
        topCardImg.classList.remove('hidden');
        
        // Show/Hide turn indicators and skip button
        if (state.drawStack > 0) {
            turnIndicator.innerText = `+${state.drawStack} Stack! Play Draw Card or Draw`;
            turnIndicator.classList.remove('hidden');
            turnIndicator.style.background = 'var(--accent-red)';
            skipBtn.classList.add('hidden');
        } else if (isMyTurn) {
            turnIndicator.innerText = 'Your Turn!';
            turnIndicator.classList.remove('hidden');
            turnIndicator.style.background = 'var(--accent-yellow)';
            
            if (state.canSkip) {
                skipBtn.classList.remove('hidden');
            } else {
                skipBtn.classList.add('hidden');
            }
        } else {
            turnIndicator.classList.add('hidden');
            skipBtn.classList.add('hidden');
        }

        // Dynamic background
        const colors = {
            'Red': 'Table_3.png',
            'Blue': 'Table_1.png',
            'Green': 'Table_2.png',
            'Yellow': 'Table_4.png'
        };
        if (colors[state.currentColor]) {
            gameRoom.style.backgroundImage = `url('/assets/${colors[state.currentColor]}')`;
        }
    }

    // Update hand
    handContainer.innerHTML = '';
    state.hand.forEach((card, index) => {
        const cardEl = document.createElement('div');
        const isSelected = selectedIndices.includes(index);
        cardEl.className = 'card' + (isSelected ? ' selected' : '');
        cardEl.innerHTML = `<img src="/assets/${card.image}" alt="${card.color} ${card.value}">`;
        
        const mid = (state.hand.length - 1) / 2;
        const offset = index - mid;
        const rotate = offset * 5;
        const translateY = Math.abs(offset) * 5;
        cardEl.style.transform = `rotate(${rotate}deg) translateY(${translateY}px)`;
        
        if (isSelected) {
            const selectionOrder = selectedIndices.indexOf(index);
            cardEl.style.zIndex = 100 + selectionOrder;
        } else {
            cardEl.style.zIndex = '';
        }

        cardEl.addEventListener('click', () => {
            if (isMyTurn) {
                toggleCardSelection(index);
            }
        });
        handContainer.appendChild(cardEl);
    });

    updateSelectedUI();
    renderOpponents(state.players);
}

function toggleCardSelection(index) {
    const card = currentHand[index];
    if (selectedIndices.includes(index)) {
        selectedIndices = selectedIndices.filter(i => i !== index);
    } else {
        // Only allow selecting if same value as existing selection
        if (selectedIndices.length > 0) {
            const firstSelected = currentHand[selectedIndices[0]];
            if (card.value === firstSelected.value) {
                selectedIndices.push(index);
            } else {
                // Switch to this card
                selectedIndices = [index];
            }
        } else {
            selectedIndices = [index];
        }
    }
    
    // Refresh hand view to show selection
    document.querySelectorAll('.hand .card').forEach((el, i) => {
        if (selectedIndices.includes(i)) {
            el.classList.add('selected');
            const selectionOrder = selectedIndices.indexOf(i);
            el.style.zIndex = 100 + selectionOrder;
        } else {
            el.classList.remove('selected');
            el.style.zIndex = '';
        }
    });

    updateSelectedUI();
}

function updateSelectedUI() {
    if (selectedIndices.length > 0) {
        selectedInfo.classList.remove('hidden');
        selectedCount.innerText = selectedIndices.length;
    } else {
        selectedInfo.classList.add('hidden');
    }
}

function renderOpponents(players) {
    opponentsContainer.innerHTML = '';
    players.forEach(player => {
        if (player.id !== socket.id) {
            const opponentEl = document.createElement('div');
            opponentEl.className = `opponent ${player.isCurrentPlayer ? 'active' : ''}`;
            opponentEl.innerHTML = `
                <div class="name">${player.name}</div>
                <div class="cards-count">${player.handCount || 0} Cards</div>
            `;
            opponentsContainer.appendChild(opponentEl);
        }
    });
}
