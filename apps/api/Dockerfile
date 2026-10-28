# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f apps/api/Dockerfile .  (ADR 0012, ADR 0014)

FROM node:26-slim AS build
WORKDIR /repo
# No .git in the image: skip installing Git hooks.
ENV LEFTHOOK=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Node 25+ ships without corepack: install the pnpm version pinned in packageManager.
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
# Manifests first, so the install layer is cached until a dependency changes.
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --filter @repo/api...
COPY packages/contracts/src packages/contracts/src
COPY apps/api apps/api
RUN pnpm --filter @repo/api build

FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build /repo/apps/api/dist dist
COPY --from=build /repo/apps/api/migrations migrations
USER node
EXPOSE 3001
# Migrate, then `exec` so node is PID 1 and receives SIGTERM for the graceful shutdown.
CMD ["sh", "-c", "node --enable-source-maps dist/migrate.js && exec node --enable-source-maps dist/main.js"]
