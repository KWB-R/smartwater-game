'use strict';

const register = require('./register');
const bootstrap = require('./bootstrap');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');
const contentTypes = require('./content-types');

module.exports = () => ({
  register,
  bootstrap,
  controllers,
  routes,
  services,
  contentTypes,
  policies: {},
  middlewares: {},
});
