# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install dependencies for backend only (including devDependencies for build)
RUN pnpm install --filter backend --frozen-lockfile

# Copy backend source
COPY backend ./backend

WORKDIR /app/backend

# Generate Prisma Client (dotenv is needed for prisma.config.ts)
RUN pnpm prisma generate

# Build application
RUN pnpm build

# Production stage
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install production dependencies for backend only
RUN pnpm install --filter backend --prod --frozen-lockfile

# Copy backend prisma files
COPY backend/prisma ./backend/prisma
COPY backend/prisma.config.ts ./backend/

WORKDIR /app/backend

# Generate Prisma Client
RUN pnpm prisma generate

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/src/main"]
