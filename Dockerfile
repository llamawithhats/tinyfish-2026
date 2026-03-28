FROM node:24-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/llm/package.json packages/llm/package.json
COPY packages/pdf/package.json packages/pdf/package.json
COPY packages/prompts/package.json packages/prompts/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/tinyfish/package.json packages/tinyfish/package.json

RUN npm install

COPY . .

RUN npx prisma generate

FROM base AS web
EXPOSE 3000
CMD ["npm", "run", "dev:web"]

FROM base AS worker
CMD ["npm", "run", "dev:worker"]
