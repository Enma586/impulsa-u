# Se construye desde la raíz del monorepo:
#   docker build -f apps/backend/Dockerfile -t impulsau-backend .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @impulsau/backend...
COPY packages/config packages/config
COPY packages/contracts packages/contracts
COPY packages/db packages/db
COPY apps/backend apps/backend
RUN pnpm --filter @impulsau/contracts --filter @impulsau/db --filter @impulsau/backend build
RUN pnpm --filter @impulsau/backend deploy --legacy --prod /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node", "dist/main-todo.js"]
