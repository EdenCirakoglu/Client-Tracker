FROM node:24-alpine AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm install --global pnpm@9.15.4
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=clientops-pnpm,target=/pnpm/store --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    pnpm install --filter @clientops/api --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json eslint.config.mjs prettier.config.cjs ./
COPY apps/api apps/api
RUN pnpm --filter @clientops/api build
RUN --mount=type=cache,id=clientops-pnpm,target=/pnpm/store --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    pnpm deploy --filter @clientops/api --prod --frozen-lockfile /prod/api

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /prod/api ./
USER node

EXPOSE 8080
CMD ["node", "dist/server.js"]
