'use strict';

const _ = require('lodash');

module.exports = async app => {
  // bail if we cannot find anything that looks like a database
  const images = require('../utils/get-service-images')(_.get(app, 'composeData', []));
  const services = require('../utils/get-db-services')(_.get(app, 'info', []), images);
  if (_.isEmpty(services)) return;

  // prefer a service actually called "database" to preserve the historical recipe default
  const host = _.find(services, {service: 'database'}) ? 'database' : _.first(services).service;
  const defaults = require('../utils/get-db-tooling-defaults')(services, host);

  // only add tooling the user or their recipe has not already claimed
  const additions = require('../utils/get-core-tooling-additions')(defaults, _.get(app, 'config.tooling', {}));
  if (_.isEmpty(additions)) return;

  // stash these so we can persist them into the compose cache and use them on the faster "engine" bootstrap path
  app._coreDbTooling = additions;
  app.config.tooling = _.merge({}, additions, _.get(app, 'config.tooling', {}));
  app.log.verbose('added default database tooling %o', _.keys(additions));
};
