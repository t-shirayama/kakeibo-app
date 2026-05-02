FROM node:20-bookworm-slim

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000
