# Stage 1: Build the React application
FROM node:22-alpine AS builder
WORKDIR /app

# Set npm config for reliability
RUN npm config set legacy-peer-deps true && npm config set fetch-timeout 120000

ARG VITE_API_URL=http://localhost:12001
ARG VITE_IA_URL=http://localhost:12002
ARG VITE_GMAIL_URL=http://localhost:12003
ARG VITE_DOC_URL=http://localhost:12004
ARG VITE_EXCEL_URL=http://localhost:12005
ARG VITE_CODE_URL=http://localhost:12006
ARG VITE_MINI_MAPS_URL=http://localhost:12007

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_IA_URL=${VITE_IA_URL}
ENV VITE_GMAIL_URL=${VITE_GMAIL_URL}
ENV VITE_DOC_URL=${VITE_DOC_URL}
ENV VITE_EXCEL_URL=${VITE_EXCEL_URL}
ENV VITE_CODE_URL=${VITE_CODE_URL}
ENV VITE_MINI_MAPS_URL=${VITE_MINI_MAPS_URL}
ENV NODE_ENV=production

# Copy package files (only package.json, ignore old lock)
COPY package.json ./

# Install dependencies - npm will create fresh lock file
RUN npm install --include=dev

# Verify vite is installed with correct version
RUN npx vite --version

# Copy source code
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
