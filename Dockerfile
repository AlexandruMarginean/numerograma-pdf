FROM node:18

# Instalare LibreOffice (fără GUI), fonturi și curl
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-core libreoffice-writer libreoffice-calc \
    fonts-dejavu curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Director de lucru
WORKDIR /app

# Copiere fișiere aplicație
COPY . .

# Instalare pachete Node.js
RUN npm install

# Pornire aplicație
CMD ["node", "index.js"]

