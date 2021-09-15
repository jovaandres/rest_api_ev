FROM node:15.4 as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

EXPOSE 80
CMD [ "node", "./bin/www"]