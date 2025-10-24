FROM node:24-alpine

WORKDIR /app

RUN npm init -y && npm install express cors

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]