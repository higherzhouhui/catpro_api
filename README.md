## Environment
### Nodejs >= 18.0
### Redis  >= 6
### Mysql >= 5.744

## Connect to the database
## mysql -uroot -p

## Create a database, with the name and password in the `.env` file

### create database cat_db;

## Install dependencies
### yarn 
### or npm i
### or pnpm i


## Initialize the database (this command will clear all tables and insert basic configuration data. It is usually executed during the first startup of the project or when data needs to be cleared; otherwise, this step can be skipped)
### npm run init

## Local debugging startup
### npm run dev (Use the `.env.dev` configuration)
### npm run start （Use the `.env` configuration）

## Start the server with Node.js process management using PM2; install it globally with the command: `npm i pm2 -g`
## Start the server, or directly use the command: `pm2 start server.js --name 'cat_api v1'`

### npm run pm2

## API documentation URL

### localhost:8086/api-docs
