FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Inbox poll (5 min) and nightly consolidation share this image.
# Override: --container-command npx --args "tsx jobs/consolidate.ts"
CMD ["npx", "tsx", "jobs/inbox.ts"]
