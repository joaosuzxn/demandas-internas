# Contexto de build: raiz do repositório (ver compose.prod.yml)

# ---------- build do Vue ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
# VITE_* entram no bundle aqui (ADR 0002): mudar exige rebuild
ARG VITE_APP_TITLE
ENV VITE_APP_TITLE=$VITE_APP_TITLE
RUN npm run build

# ---------- nginx servindo o dist/ ----------
FROM nginx:stable-alpine
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
