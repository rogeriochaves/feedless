FROM node:11

WORKDIR /app

COPY zdocker/package-20200420.json package.json
COPY zdocker/package-lock-20200420.json package-lock.json
RUN npm install

COPY package.json package-lock.json ./
RUN npm install
COPY . .

CMD npm run start