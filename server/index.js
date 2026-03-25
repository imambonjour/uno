const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Game = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));
app.use('/assets', express.static(path.join(__dirname, '../assets/un0')));

const games = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', ({ roomId, playerName }) => {
        socket.join(roomId);
        
        if (!games[roomId]) {
            games[roomId] = new Game(roomId);
        }

        const game = games[roomId];
        if (game.started) {
            socket.emit('error', 'Game already started');
            return;
        }

        if (game.addPlayer(socket.id, playerName)) {
            io.to(roomId).emit('roomUpdate', game.getState());
        } else {
            socket.emit('error', 'Room is full');
        }
    });

    socket.on('startGame', (roomId) => {
        const game = games[roomId];
        if (game && game.start()) {
            io.to(roomId).emit('gameStarted', roomId);
            updateAllPlayers(roomId);
        }
    });

    socket.on('playCard', ({ roomId, cardIndices, colorSelection }) => {
        const game = games[roomId];
        if (game) {
            const result = game.playCard(socket.id, cardIndices, colorSelection);
            if (result.error) {
                socket.emit('error', result.error);
            } else if (result.status === 'need_color_selection') {
                socket.emit('needColorSelection', cardIndices);
            } else {
                updateAllPlayers(roomId);
                if (result.status === 'won') {
                    io.to(roomId).emit('gameOver', game.winner);
                }
            }
        }
    });

    socket.on('drawCard', (roomId) => {
        const game = games[roomId];
        if (game) {
            const result = game.drawCard(socket.id);
            if (result.error) {
                socket.emit('error', result.error);
            } else {
                updateAllPlayers(roomId);
            }
        }
    });

    socket.on('skipTurn', (roomId) => {
        const game = games[roomId];
        if (game) {
            const result = game.skipTurn(socket.id);
            if (result.error) {
                socket.emit('error', result.error);
            } else {
                updateAllPlayers(roomId);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomId in games) {
            const game = games[roomId];
            game.removePlayer(socket.id);
            io.to(roomId).emit('roomUpdate', game.getState());
        }
    });
});

function updateAllPlayers(roomId) {
    const game = games[roomId];
    if (!game) return;

    game.players.forEach(player => {
        io.to(player.id).emit('gameState', game.getState(player.id));
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
