FROM public.ecr.aws/lambda/nodejs:20 AS builder
WORKDIR /build
COPY package*.json ./
COPY prisma ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY ./src/utils/migration-runner.ts ./
RUN npx esbuild migration-runner.ts --bundle --outdir=dist --platform=node --external:@prisma/client

FROM public.ecr.aws/lambda/nodejs:20 AS runner
COPY package-lock.json package.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=builder /build/dist ./

CMD ["migration-runner.handler"]
