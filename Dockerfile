# syntax=docker/dockerfile:1.7
#
# The Next.js web app, as a standalone Node server.
#
#   docker build -t abizon-web \
#     --build-arg STORAGE_ORIGIN=https://<bucket>.s3.ap-south-1.amazonaws.com \
#     --build-arg SITE_URL=https://<domain> \
#     --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=... \
#     .
#
# Targets:
#   runtime (default)  node server.js on :3000
#   migrate            npx drizzle-kit migrate — the web app's tables in `public`
#
# BUILD ARGUMENTS ARE BAKED IN. Next.js inlines NEXT_PUBLIC_* into the browser
# bundle and evaluates next.config.ts (the CSP, with STORAGE_ORIGIN) at build
# time. Changing any of them means rebuilding the image; setting them only at
# runtime does nothing. Secrets are never build arguments — they are runtime
# environment (deploy/env/web.env) and never enter an image layer.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Installed inside Linux, never copied from a developer machine: `sharp` ships a
# native binary per platform, and a Windows node_modules would not run here.
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG STORAGE_ORIGIN
ARG SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
ENV STORAGE_ORIGIN=$STORAGE_ORIGIN \
    SITE_URL=$SITE_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prebuild` places the OCR engine in public/tesseract before `next build`.
RUN npm run build

# --- Web app tables (Drizzle) ---------------------------------------------------
FROM build AS migrate
CMD ["npx", "drizzle-kit", "migrate"]

# --- Runtime ----------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone server does not serve `public/` or `.next/static` unless they
# are copied next to it.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# Liveness: any HTTP answer means the process is serving. /api/health returns
# 503 when the database is down, which is a reason to alert, not to restart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(()=>process.exit(0)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
