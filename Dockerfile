FROM node:15.4 as build

WORKDIR /api

COPY package*.json /api/

RUN npm install

COPY . /api/

EXPOSE 4000
CMD [ "node", "./bin/www"]