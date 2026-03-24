FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# Copy source
COPY src ./src/
COPY tsconfig.json ./

# Expose port (Cloud Run injects PORT env var)
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
