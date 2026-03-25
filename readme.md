# Uno Multiplayer

A real-time multiplayer Uno game built with Node.js, Socket.io, and a playful, gaming-inspired UI.

## Features

- **Real-Time Multiplayer**: Join rooms and play with friends.
- **Advanced Stacking**: Stack +2 and +4 cards to multiply penalties.
- **Multi-Card Plays**: Group cards of the same value to play them together.
- **Draw and Play/Skip**: Draw a card and choose to play it or skip.
- **Playful UI**: Vibrant colors, Fredoka font, and "bouncy" animations.

## How to Run

### Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   node server/index.js
   ```
3. Open `http://localhost:3000` in your browser.

### Using Docker

1. Start the container:
   ```bash
   docker compose up -d
   ```
2. Open `http://localhost:7772` on your host machine.

## Assets
The game uses high-quality card and table assets located in the `assets/` directory.

## Project Structure
- `server/`: Game logic and Socket.io server.
- `public/`: Client-side HTML, CSS, and JS.
- `assets/`: Game visuals.
- `Dockerfile` & `docker-compose.yml`: Containerization settings.
