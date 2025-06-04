FROM node:20-slim

# Instalăm LibreOffice
RUN apt-get update && apt-get install -y libreoffice --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

# Setăm directorul de lucru
WORKDIR /app

# Copiem fișierele în container
COPY . .

# Instalăm dependențele
RUN npm install

# Expunem portul aplicației
EXPOSE 8080

# Comanda care pornește serverul
CMD ["node", "index.js"]
