# ---------------------------------------------------------------------------
# Master Shield API + embedded PostgreSQL.
#
# The database runs inside this image and listens only on the loopback/internal
# network; it is never published. The API binds the container network so the
# frontend container can reach it. All credentials come from the environment.
# ---------------------------------------------------------------------------

# --- Build stage -----------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore against the project file alone so the dependency layer caches.
COPY MasterShield/MasterShield.csproj MasterShield/
RUN dotnet restore MasterShield/MasterShield.csproj

COPY MasterShield/ MasterShield/
RUN dotnet publish MasterShield/MasterShield.csproj -c Release -o /app

# --- Runtime stage ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# PostgreSQL ships in the base Debian repositories; install it plus the tooling
# the entrypoint needs to initialise and supervise it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql postgresql-contrib gosu \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://0.0.0.0:5120 \
    DOTNET_RUNNING_IN_CONTAINER=true

WORKDIR /app
COPY --from=build /app ./

# Entrypoint initialises the cluster (once), starts Postgres, then the API.
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

# Uploaded media and the database live on volumes so they survive restarts.
VOLUME ["/var/lib/postgresql", "/app/wwwroot/uploads"]

EXPOSE 5120

ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
