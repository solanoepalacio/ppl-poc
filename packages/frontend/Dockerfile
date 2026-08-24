# syntax=docker/dockerfile:1
#
# Frontend image (Next.js 16 App Router).
#
# The build context is the REPO ROOT, not this directory — a Yarn workspace
# install needs the root manifest, the lockfile and every workspace's
# package.json. See docker-compose.yml.

# ── build ────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable

# Manifests first, sources later: this layer is only invalidated when a
# dependency changes, so editing code reuses the cached (slow) install.
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN yarn install --immutable

COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# they cannot be set from docker-compose later. The defaults in the source are
# the right ones for this deployment (`/api`, proxied to the backend); override
# here with --build-arg only if that ever stops being true.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_UMAMI_HOST
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID

# The `/api/*` -> backend rewrite in next.config.js is evaluated by `next build`
# and frozen into .next/routes-manifest.json, so unlike every other server-side
# variable this one cannot be supplied at run time — left unset it bakes in the
# `http://localhost:3000` dev default and every proxied browser request fails
# with ECONNREFUSED. docker-compose.yml passes the same value here and in the
# container's environment (server components read it at run time, via
# lib/api.ts) from a single definition, so the two cannot drift.
ARG BACKEND_INTERNAL_URL
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}

ENV NEXT_TELEMETRY_DISABLED=1

# @pannico/shared is consumed through its built dist/, so it has to compile
# first — even though Next also transpiles its source (transpilePackages).
RUN yarn workspace @pannico/shared run build \
 && NODE_ENV=production yarn workspace @pannico/frontend run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app/packages/frontend
RUN corepack enable

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=6065

COPY --from=builder /app /app

EXPOSE 6065

# `/login` is public (the proxy has to let it through, or logging in would
# redirect to itself), which makes it the one route that proves the server
# renders without needing a session.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||6065)+'/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# `next start` honours PORT; the package script pins :3001 for local dev, so it
# is bypassed here on purpose.
CMD ["yarn", "next", "start"]
