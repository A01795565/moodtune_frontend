# --- Etapa de build ---
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    else npm install; fi
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_FER_ENDPOINT_URL
ARG VITE_RAG_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FER_ENDPOINT_URL=${VITE_FER_ENDPOINT_URL}
ENV VITE_RAG_BASE_URL=${VITE_RAG_BASE_URL}
RUN npm run build

# --- Etapa de runtime ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
