FROM node:20-alpine

WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm install --omit=dev

# Copier le code source
COPY src/ ./src/

# Dossier uploads
RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "src/index.js"]
