FROM keymetrics/pm2:10-alpine
LABEL VERSION="1.0.9"
LABEL STAGE="9"
LABEL AUTHOR="Shady Khalifa <shekohex@gmail.com>"
# Server Port, we will link it to 80 on the host
ENV SERVER_PORT=3000

RUN mkdir -p /var/nodex
# Change Workdir in docker container
WORKDIR /var/nodex

RUN apk update
# Install FFMPEG
RUN apk add --no-cache ffmpeg git

# Fix UUID Issue
RUN npm config set unsafe-perm true

# Update NPM
RUN npm i npm@latest -g
# Check versions
RUN node -v && npm -v && ffmpeg -version && git --version

# Take package.json first
# we take it first so we don't have to make `npm install` again every time we build image
COPY package.json .

# Install Dependencies and then clean the cache
RUN NODE_ENV=production npm install --only=production && npm cache clean --force

# Structure Public Folder
RUN mkdir -p public/logs && \
    mkdir -p public/uploads/clips && \
    mkdir -p public/uploads/photos && \
    mkdir -p public/uploads/videos && \
    mkdir -p public/uploads/files && \
    mkdir -p public/uploads/thumbnails && \
    mkdir -p locales
# And add it as Volume and we will mount it from the host
VOLUME [ "/var/nodex/public" ]
VOLUME [ "/var/nodex/locales" ]

# The docs folder too
RUN mkdir -p docs

# Copy compiled app
COPY ./build src/
# And Other files also
COPY firebase-privatekey.pem .
COPY my-community-dev-project-firebase-adminsdk.json .
COPY .env .

# Used by pm2
COPY ecosystem.config.js .

# Expose the listening port of your app
EXPOSE ${SERVER_PORT}

CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]