const expressJSDocSwagger = require('express-jsdoc-swagger');

const options = {
  info: {
    version: '2.0.0',
    title: 'forkfrenpet接口文档',
    description:
      'forkfrenpet 后台api接口文档，需要手动配置token，点击Authorize'
  },
  security: {
    Authorization: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: ''
    }
  },
  filesPattern: ['../api/*.js'], // Glob pattern to find your jsdoc files
  swaggerUIPath: '/api-docs', // SwaggerUI will be render in this url. Default: '/api-docs'
  baseDir: __dirname
};

module.exports = function (app) {
  expressJSDocSwagger(app)(options);
};
