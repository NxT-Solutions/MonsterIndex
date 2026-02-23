FROM node:lts-alpine

RUN apk --no-cache update && apk --no-cache add git openssh libc6-compat

RUN npm install -g pnpm

WORKDIR /app
