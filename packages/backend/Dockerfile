# syntax=docker/dockerfile:1
#
# Backend image (NestJS + Prisma/SQLite).
#
# The build context is the REPO ROOT, not this directory — a Yarn workspace
# install needs the root manifest, the lockfile and every workspace's
# package.json. See docker-compose.yml.

# ── build ────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# openssl before `prisma generate`: the generator picks its query engine by
# sniffing the OpenSSL version present at build time, and with none installed
# it guesses 1.1.x — an engine the (bookworm, OpenSSL 3) runtime stage then
# refuses to load. Installing it here makes both stages agree.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable

# Manifests first, sources later: this layer is only invalidated when a
# dependency changes, so editing code reuses the cached (slow) install.
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN yarn install --immutable

COPY packages/shared packages/shared
COPY packages/backend packages/backend

# @pannico/shared is consumed through its built dist/, so it has to compile
# first. `prisma generate` writes the client into node_modules, which the
# runtime stage inherits along with the rest of the tree.
RUN yarn workspace @pannico/shared run build \
 && yarn workspace @pannico/backend run prisma:generate \
 && yarn workspace @pannico/backend run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app/packages/backend

# openssl: Prisma's query engine links against libssl at runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable

ENV NODE_ENV=production
ENV PORT=6066

# The whole built tree, dev dependencies included: the container runs
# `prisma migrate deploy` on start, and the Prisma CLI is a dev dependency.
COPY --from=builder /app /app

EXPOSE 6066

# Any HTTP answer proves the process is up and routing; 404 on `/` is still an
# answer. Uses node's built-in fetch so the image needs no curl.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||6066)+'/').then(()=>process.exit(0),()=>process.exit(1))"

ENTRYPOINT ["/app/packages/backend/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
