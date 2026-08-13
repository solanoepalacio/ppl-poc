#!/bin/sh
# Brings the database up to date before the API starts accepting traffic.
#
# Both steps are safe to repeat on every boot, which is what makes them
# belong here rather than in a one-off setup command: `migrate deploy` applies
# only the migrations the database has not seen, and the seed is idempotent
# (it upserts the catalog by name and only opens a bloque when none is open).
# A restart after a reboot therefore converges an empty volume and an existing
# database to the same place.
set -e

echo "[entrypoint] applying migrations to ${DATABASE_URL}"
yarn prisma migrate deploy

echo "[entrypoint] seeding catalog"
node dist/prisma/seed.js

exec "$@"
