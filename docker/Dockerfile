FROM node:20-alpine

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier le code source de l'application
COPY src/ ./src/

EXPOSE 8087

CMD ["node", "src/server.js"]
