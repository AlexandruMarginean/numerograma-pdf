# Imagine oficială Node.js cu LibreOffice instalat
FROM node:18-slim

# Instalăm LibreOffice + fonturi utile pentru PDF
RUN apt-get update && apt-get install -y \
  libreoffice \
  fonts-dejavu \
  fonts-liberation \
  ttf-mscorefonts-installer \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Setăm directorul de lucru
WORKDIR /app

# Copiem fișierele proiectului
COPY . .

# Instalăm pachetele
RUN npm install

# Pornim serverul
CMD ["npm", "start"]

