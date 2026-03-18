# Use a lightweight Node.js environment
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy your package files first (this makes builds faster)
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Set the environment to production so the server uses the built files
ENV NODE_ENV=production

# Expose the port your Express server runs on
EXPOSE 3000

# Build the Vite frontend at runtime so it has access to Render's environment variables
# (Render does not pass dashboard environment variables to the Docker build step)
CMD npm run build && npx tsx server.ts
