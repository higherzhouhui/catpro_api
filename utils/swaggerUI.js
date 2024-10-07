const expressJSDocSwagger = require('express-jsdoc-swagger');

const options = {
  info: {
    version: '1.0.0',
    title: 'CAT_API API documentation',
    description:
      'CAT_API API documentation requires manual token configuration，Click Authorize'
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
