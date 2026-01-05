FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -g pm2

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port (if needed for health checks)
EXPOSE 3000

# Start with PM2
CMD ["pm2-runtime", "start", "pm2.config.js"]