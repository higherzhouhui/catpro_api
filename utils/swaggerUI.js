const expressJSDocSwagger = require('express-jsdoc-swagger');

const options = {
  info: {
    version: '1.0.0',
    title: 'CAT_API接口文档',
    description:
      'CAT_API接口文档，需要手动配置token，点击Authorize'
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
