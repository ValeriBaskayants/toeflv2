FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate --schema=./prisma/schema

RUN npm run build

EXPOSE 3001
CMD ["node", "dist/main"]
