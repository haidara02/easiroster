FROM node:20-bullseye

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
RUN npx playwright install --with-deps chromium


COPY src ./src

# Configure port for HTTP server
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]

