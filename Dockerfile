FROM node:7

RUN mkdir /src

WORKDIR /src
ADD . /src
RUN npm install

EXPOSE 3000

WORKDIR /src

CMD npm start
