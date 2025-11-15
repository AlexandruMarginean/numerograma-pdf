FROM node:18

# Instalăm LibreOffice + fonturi utile pentru PDF (fără pachetul care nu există în bookworm)
RUN apt-get update && apt-get install -y \
  libreoffice \
  fonts-dejavu \
  fonts-liberation \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*


# Director de lucru
WORKDIR /app

# Copiere fișiere aplicație
COPY . .

# Instalare pachete Node.js
RUN npm install

# Pornire aplicație
CMD ["node", "index.js"]

