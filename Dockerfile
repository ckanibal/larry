FROM node:9-alpine
WORKDIR /usr/src/larry
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh python make g++

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Network
EXPOSE 8080

# Run
CMD ["npm", "start"]
