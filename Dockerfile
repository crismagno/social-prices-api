FROM node:16.20.0

WORKDIR /app

RUN apt-get update && \
    apt-get install vim -y && \
    npm install  -g @nestjs/cli && \
		npm uninstall bcrypt \
		npm install bcrypt@latest --save

CMD [ "npm", "run", "start:dev" ]

EXPOSE 8080
