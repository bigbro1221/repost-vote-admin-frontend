FROM node@sha256:bf77dc26e48ea95fca9d1aceb5acfa69d2e546b765ec2abfb502975f1a2d4def AS node

ENV APP_PORT=8080

WORKDIR /var/www/app

COPY package*.json ./

RUN npm install

COPY . ./
COPY .env ./.env

RUN npx next telemetry disable
RUN npm run build

EXPOSE $APP_PORT

CMD ["npm", "start"]

HEALTHCHECK --interval=5s --timeout=5m \
	CMD sh -c 'curl http://localhost:$APP_PORT' || exit 1
