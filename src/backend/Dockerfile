FROM node:24-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm install

COPY src ./src
COPY migrations ./migrations
COPY migrate.js ./

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]