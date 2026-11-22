FROM node:22-bookworm AS dependencies

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci

FROM dependencies AS builder
COPY server /app/server
COPY web /app/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Compile config so the runtime does not need dev-only TypeScript.
RUN node --input-type=module -e "import ts from 'typescript'; import fs from 'node:fs'; fs.writeFileSync('next.config.mjs', ts.transpileModule(fs.readFileSync('next.config.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)"

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev && npm prune --omit=dev --prefix /app/server

FROM node:22-bookworm-slim AS runner

WORKDIR /app/server

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY server/package*.json ./
COPY --from=production-dependencies /app/server/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist

WORKDIR /app/web
COPY web/package*.json ./
COPY --from=production-dependencies /app/web/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/web/.next ./.next
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/next.config.mjs ./next.config.mjs
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 3000

CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
