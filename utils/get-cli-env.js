'use strict';

const _ = require('lodash');

module.exports = function(more = {}) {
  let githubEnvVars = {};
  if (process.env.LANDO_CLI_ENV_JSON) {
    githubEnvVars = JSON.parse(process.env.LANDO_CLI_ENV_JSON);
  }

  return _.merge({}, {
    PHP_MEMORY_LIMIT: '-1',
  }, githubEnvVars, more);
};
