# ---------------------------------------------------------------------------
# Master Shield frontend.
#
# Builds the Angular application and serves it with nginx, which also proxies
# /api and /uploads to the API container so the browser only ever talks to one
# origin. The upstream host is injected at container start from the environment.
# ---------------------------------------------------------------------------

# --- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile for a reproducible build.
COPY master-shield/package.json master-shield/package-lock.json ./
RUN npm ci

COPY master-shield/ ./
RUN npm run build -- --configuration production

# --- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist/master-shield/browser /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# API_UPSTREAM is substituted into the nginx config by the base image's
# entrypoint (envsubst). Defaults to the compose service name.
ENV API_UPSTREAM=http://api:5120 \
    NGINX_PORT=8080

EXPOSE 8080
