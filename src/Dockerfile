# Use Node 8 LTS
FROM node:8

# Create app dir inside container
WORKDIR /nodeapp

# Install app dependencies separately (creating a separate layer for node_modules, effectively caching them between image rebuilds)
COPY package.json .
RUN npm install

# Copy app's source files
COPY . .

# Use dumb-init for startup
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64
RUN chmod +x /usr/local/bin/dumb-init


# Create and use non-root user 
RUN groupadd -r nodejs \
   && useradd -m -r -g nodejs nodejs

USER nodejs


CMD ["dumb-init", "node", "butler.js"]
