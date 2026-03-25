FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server/ ./server/
COPY public/ ./public/
COPY assets/ ./assets/

EXPOSE 3000

CMD ["node", "server/index.js"]
