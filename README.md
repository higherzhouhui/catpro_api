# 环境
Nodejs >= 18.0
Redis  >= 6
Mysql  >= 5.744

# 连接数据库
mysql -uroot -p

# 创建数据库，名称和密码在env文件中

create database cat_db;

# 安装依赖
yarn or npm i or pnpm i 


# 初始化数据库
npm run init

# NODEJS进程守卫，使用pm2;npm i pm2 -g
 
# 启动 或者 直接 pm2 start server.js --name 'cat_api v1'
npm run pm2

# 接口文档地址
localhost: port/api-docs
