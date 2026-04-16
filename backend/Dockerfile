FROM node:20-alpine

WORKDIR /app/backend

# Instalar Python y pip para el script fill.py
RUN apk add --no-cache python3 py3-pip && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    pip3 install --break-system-packages --root-user-action=ignore pdfrw

# Copiar shared (necesario para el backend)
COPY shared/ /app/shared/

# Instalar dependencias del backend
COPY backend/package*.json ./
RUN npm install

# Copiar el resto del backend
COPY backend/ .

ENV NODE_ENV=production
ENV NO_UPDATE_NOTIFIER=1

EXPOSE 4000

CMD ["node", "server.js"]
