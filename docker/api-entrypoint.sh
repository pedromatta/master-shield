#!/bin/bash
# ---------------------------------------------------------------------------
# Starts an embedded PostgreSQL instance, then the Daedala API.
#
# The database is reachable only on the container's own loopback and the
# internal Docker network — it is never published to the host. Every credential
# is read from the environment (see .env / .env.example).
# ---------------------------------------------------------------------------
set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"

PGDATA=/var/lib/postgresql/data
PGPORT="${POSTGRES_PORT:-5432}"

# Debian packages the PostgreSQL binaries under a versioned directory that is not on PATH.
PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
if [ -z "$PG_BIN" ]; then
  echo "[entrypoint] Could not locate the PostgreSQL binaries" >&2
  exit 1
fi
export PATH="$PG_BIN:$PATH"

# --- Initialise the cluster on first boot ----------------------------------
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[entrypoint] Initialising PostgreSQL cluster at $PGDATA"
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"

  # initdb reads the superuser password from a file; a temp file avoids process
  # substitution, which gosu cannot read.
  PWFILE="$(mktemp)"
  printf '%s' "$POSTGRES_PASSWORD" > "$PWFILE"
  chown postgres:postgres "$PWFILE"

  gosu postgres initdb \
    -D "$PGDATA" \
    --username "$POSTGRES_USER" \
    --pwfile="$PWFILE" \
    --auth-local=trust \
    --auth-host=scram-sha-256

  rm -f "$PWFILE"

  # Listen on loopback and the container network, but only inside this container.
  echo "listen_addresses = '127.0.0.1'" >> "$PGDATA/postgresql.conf"
  echo "port = $PGPORT" >> "$PGDATA/postgresql.conf"
  echo "host all all 127.0.0.1/32 scram-sha-256" >> "$PGDATA/pg_hba.conf"
  echo "host all all ::1/128 scram-sha-256" >> "$PGDATA/pg_hba.conf"
fi

# --- Start PostgreSQL in the background ------------------------------------
echo "[entrypoint] Starting PostgreSQL on 127.0.0.1:$PGPORT"
gosu postgres pg_ctl -D "$PGDATA" -o "-p $PGPORT" -w start

# Create the application database if it does not exist yet. The superuser is
# $POSTGRES_USER (initdb created it), not the default "postgres" role.
if ! gosu postgres psql -p "$PGPORT" -U "$POSTGRES_USER" -d postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1; then
  echo "[entrypoint] Creating database '$POSTGRES_DB'"
  gosu postgres createdb -p "$PGPORT" -U "$POSTGRES_USER" "$POSTGRES_DB"
fi

# --- Run the API -----------------------------------------------------------
# Compose the connection string from the environment so no credential is baked
# into the image. The API applies EF migrations on startup.
export ConnectionStrings__PostgreSQL="Host=127.0.0.1;Port=$PGPORT;Database=$POSTGRES_DB;Username=$POSTGRES_USER;Password=$POSTGRES_PASSWORD"

echo "[entrypoint] Starting Daedala API"
exec dotnet Daedala.dll
