FROM node:20-alpine AS base
WORKDIR /app

# Install bash (required for CMD shell form)
RUN apk add --no-cache bash curl

# Install Bun
RUN npm install -g bun

# Create non-root user for security
RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser

# Install dependencies
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# Copy source
COPY src ./src/
COPY tsconfig.json ./

EXPOSE 3000

# Use exec form (not shell form) to avoid entrypoint issues
ENTRYPOINT ["sh", "-c"]
CMD ["exec bun run src/index.ts"]
