# Node 24.22.2, verified linux/amd64 on the release host on 2026-10-30.
FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c

ARG RELEASE_SHA
LABEL org.opencontainers.image.source="https://github.com/himanshu748/borrowed-confidence"
LABEL org.opencontainers.image.revision="${RELEASE_SHA}"

WORKDIR /app
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# All provider tests inject fixtures. Building never submits a live render.
RUN npm test && npm run build \
    && mkdir -p /data && chown node:node /data

ENV NODE_ENV=production PORT=3001 DATA_DIR=/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/api/status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
# tsx is intentionally retained: the current server source is TypeScript.
CMD ["node", "--import", "tsx", "server/index.ts"]
