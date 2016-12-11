FROM node:boron

# Force DEV environment
ENV NODE_ENV development

# Create app directory
RUN mkdir -p /usr/src/LedNet
WORKDIR /usr/src/LedNet

# Install nodemon
RUN npm install -g nodemon

# Install app dependencies
COPY package.json /usr/src/LedNet/package.json
RUN npm install

# Start server
EXPOSE 8080
CMD [ "nodemon" ]
