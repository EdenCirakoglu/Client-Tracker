FROM node:20-alpine AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @clientops/api --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json eslint.config.mjs prettier.config.cjs ./
COPY apps/api apps/api
RUN pnpm --filter @clientops/api build
RUN pnpm deploy --filter @clientops/api --prod /prod/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /prod/api ./

EXPOSE 8080
CMD ["node", "dist/server.js"]

