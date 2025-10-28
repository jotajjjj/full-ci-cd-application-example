# Etapa de construcción para la aplicación Ionic - USANDO NODE 20
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de package primero (para mejor caching)
COPY package*.json ./
COPY angular.json ./
COPY ionic.config.json ./
COPY tsconfig*.json ./
COPY src/ ./src/

# Instalar dependencias
RUN npm ci

# Construir la aplicación Ionic para producción
RUN npm run build --prod

# Etapa de producción
FROM nginx:alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

# Copiar los archivos construidos desde la etapa de builder
COPY --from=builder /app/www /usr/share/nginx/html

# Copiar configuración nginx optimizada para Angular/Ionic
COPY nginx.conf /etc/nginx/nginx.conf

# Crear un archivo de health check
RUN echo '{"status": "healthy", "timestamp": "'$(date)'"}' > /usr/share/nginx/html/health.json

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost/health.json || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]