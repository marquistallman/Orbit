# Stage 1: Build the React application
FROM node:22 AS builder
WORKDIR /app
ARG VITE_MINI_MAPS_URL
ENV VITE_MINI_MAPS_URL=$VITE_MINI_MAPS_URL
# Copy package files
COPY package.json package-lock.json ./
# Install dependencies
RUN npm ci
# Fix rollup optional dependency bug
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional
RUN npm install -D @swc/core
# Copy source
COPY . .
# Build
RUN npm run build
# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
