# GoSpeak — ảnh Docker cho server.
#   docker compose -f docker-compose.prod.yml build
# Ba đích:
#   tools  : đủ mã nguồn + devDependencies — chạy prisma migrate deploy và seed
#   runner : chỉ .next/standalone — ảnh chạy web, gọn nhẹ

FROM node:22-bookworm-slim AS base
# openssl: Prisma CLI (migrate) cần để chạy schema engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Cài thư viện (tách riêng để Docker cache khi chỉ sửa code) ──
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ── Mã nguồn + Prisma client ──
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# ── Build Next.js ──
FROM tools AS builder
# VPS 4 GB: chặn heap để bước build không bị kill (kèm swap, xem deploy/README.md)
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# ── Ảnh chạy web ──
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
