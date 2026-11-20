# The web app is a static export (output: "export"), so the image builds the
# site into out/ and serves those files; `next start` doesn't work with export.

FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are baked into the static files at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_DEV_AUTH=true
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEV_AUTH=$NEXT_PUBLIC_DEV_AUTH

RUN npm run build

FROM node:24-alpine

WORKDIR /app

RUN npm install -g serve@14.2.8

COPY --from=build /app/out ./out

EXPOSE 3000

# serve maps clean URLs (/dashboard -> dashboard.html), like Cloudflare Pages.
CMD ["serve", "out", "-l", "3000", "--no-port-switching"]
