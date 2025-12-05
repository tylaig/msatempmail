FROM node:18-alpine

# Install build dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Install Haraka globally
# --unsafe-perm might be needed for some global installs in docker
RUN npm install -g Haraka --unsafe-perm

# Set working directory
WORKDIR /usr/local/haraka

# Expose SMTP port
EXPOSE 25

# Run Haraka
CMD ["haraka", "-c", "."]
