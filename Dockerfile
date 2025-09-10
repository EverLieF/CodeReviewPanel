# deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/
RUN npm ci && npm ci --prefix server && npm ci --prefix client

# build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
ENV NODE_ENV=production
RUN npm run build

# runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# для healthcheck
RUN apk add --no-cache curl
# скопируем только то, что нужно для рантайма
COPY --from=build /app/server/dist /app/server/dist
COPY --from=build /app/dist/public /app/dist/public
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/server/package.json /app/server/package.json
COPY --from=deps  /app/node_modules /app/node_modules
COPY --from=deps  /app/server/node_modules /app/server/node_modules
# директория для артефактов (том)
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/healthz || exit 1
CMD ["npm","start"]
