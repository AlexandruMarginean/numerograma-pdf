FROM node:18

# Instalare LibreOffice + alte utilitare necesare
RUN apt-get update && apt-get install -y \
    libreoffice \
    fonts-dejavu \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Creare director de lucru
WORKDIR /app

# Copiere fișiere
COPY . .

# Instalare dependințe Node.js
RUN npm install

CMD ["npm", "start"]
