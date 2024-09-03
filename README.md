## 环境
### Nodejs >= 18.0
### Redis  >= 6
### Mysql >= 5.744

## 连接数据库
## mysql -uroot -p

## 创建数据库，名称和密码在env文件中

### create database cat_db;

## 安装依赖
### yarn 
### or npm i
### or pnpm i


## 初始化数据库（该命令会清空所有数据表并插入基本配置数据，一般是第一次启动项目或者需要清空数据的时候执行，其他情况可以跳过该步骤）
### npm run init

## 本地调试启动
### npm run dev:local (使用.env.dev配置)
### npm run dev （使用.env配置）

## 服务器启动，NODEJS进程守卫，使用pm2;npm i pm2 -g
## 启动 或者 直接 pm2 start server.js --name 'cat_api v1'

### npm run pm2

## 接口文档地址

### localhost:8086/api-docs
