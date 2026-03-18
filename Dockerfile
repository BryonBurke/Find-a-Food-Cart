# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Build the application
# We use a lower heap limit to stay within Render's 512MB limit
RUN NODE_OPTIONS=--max-old-space-size=384 npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Set environment
ENV NODE_ENV=production
EXPOSE 3000

# Start the server
# Using the compiled JS for maximum memory efficiency
CMD ["npm", "start"]
