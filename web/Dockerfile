FROM node:20-alpine AS builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci

COPY server /app/server
COPY web /app/web
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app/server

ENV NODE_ENV=production

COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./dist

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/web/.next ./.next
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
