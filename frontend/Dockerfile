# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Argumento para la URL del backend (vacío = rutas relativas para nginx)
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV NO_UPDATE_NOTIFIER=1

# Copiar shared (necesario para la build del frontend)
COPY shared/ shared/

# Instalar dependencias del frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm install

# Copiar el resto del frontend y construir
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Production stage (archivos estáticos servidos por nginx)
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
