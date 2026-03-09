FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY web/package.json ./web/
RUN bun install --frozen-lockfile

# Build SPA
FROM deps AS spa-builder
COPY web/ ./web/
RUN cd web && bun run build

# Production runner
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 --ingroup app app

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./
COPY --from=spa-builder /app/web/dist ./web/dist

RUN mkdir -p /tmp && chown app:app /tmp
USER app

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
