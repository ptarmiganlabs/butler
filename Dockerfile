# Build Docker image for Amd64
FROM node:22-bullseye-slim

# Add metadata about the image
LABEL maintainer="Göran Sander mountaindude@ptarmiganlabs.com"
LABEL description="Adding superpowers to Qlik Sense Enterprise on Windows."

# Create app dir inside container
WORKDIR /nodeapp

# Install app dependencies separately (creating a separate layer for node_modules, effectively caching them between image rebuilds)
COPY package.json .
RUN npm install

# Copy app's source files
COPY . .

# Install wget for easier Docker health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Create and use non-root user 
RUN groupadd -r nodejs \
   && useradd -m -r -g nodejs nodejs

USER nodejs

# Set up Docker healthcheck
HEALTHCHECK --interval=12s --timeout=12s --start-period=30s CMD ["node", "src/docker-healthcheck.js"]

CMD ["node", "src/butler.js"]

