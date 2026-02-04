FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Configure port for HTTP server
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]

