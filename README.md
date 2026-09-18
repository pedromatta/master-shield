# Daedala

A game-agnostic RPG Game Master digital shield: campaigns, sessions, encounters,
actors, locations, rules and notes backed by an ASP.NET Core API and an Angular
frontend.

## Repository layout

| Path            | Contents                                             |
| --------------- | ---------------------------------------------------- |
| `Daedala/` | ASP.NET Core Web API (EF Core + PostgreSQL)          |
| `daedala/`| Angular frontend (standalone components, signals)    |
| `docker/`       | Container build files and entrypoints                |
| `docker-compose.yml` | The container stack                             |

## Running with Docker

The whole application runs as two containers on a private network:

* **api** — the API **and** its PostgreSQL instance inside one container. The
  database listens on `127.0.0.1` only and is never published, so it is reachable
  solely by the API process.
* **web** — nginx serving the built Angular app and reverse-proxying `/api` and
  `/uploads` to the api container, so the browser talks to a single origin.

Only the web port is published to the host.

```bash
# 1. Provide the credentials/secrets.
cp .env.example .env
# edit .env and set real values (POSTGRES_PASSWORD in particular)

# 2. Build and start.
docker compose up -d --build

# 3. Open the app (defaults to http://localhost:8090).
```

Data persists in two named volumes: `api-db` (the database cluster) and
`api-uploads` (uploaded portraits, maps and icons). Remove them with
`docker compose down -v`.

### Configuration

Every credential is read from `.env`:

| Variable            | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `POSTGRES_USER`     | Database superuser and application role             |
| `POSTGRES_PASSWORD` | Database password                                   |
| `POSTGRES_DB`       | Application database name                           |
| `POSTGRES_PORT`     | Database port (internal only)                       |
| `CORS_ORIGINS`      | Comma-separated browser origins allowed by the API  |
| `WEB_PORT`          | Host port the frontend is published on              |
| `API_UPSTREAM`      | Where nginx forwards `/api` and `/uploads`          |

`.env` is gitignored — never commit it.

## Local development

Run the API and the Angular dev server directly (PostgreSQL must be reachable):

```bash
# API
cd Daedala
dotnet run            # listens on http://localhost:5120

# Frontend (separate terminal)
cd daedala
npm install
npm start             # http://localhost:4200, proxied to the API
```

The connection string is read from `ConnectionStrings:PostgreSQL` (user secrets
or an environment variable).
