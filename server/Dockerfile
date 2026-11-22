FROM node:22-bookworm AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 5000

CMD ["node", "dist/index.js"]
