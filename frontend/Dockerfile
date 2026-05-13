FROM node:22-alpine

WORKDIR /app

# Instala dependências em camada própria pra aproveitar cache do build.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
