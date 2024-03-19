FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

CMD node ./bin/index.mjs handshake -i $INFOHASH -a $ADDRESS
