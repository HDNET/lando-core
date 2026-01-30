'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (!_.isEmpty(_.get(app, 'config.tooling', {}))) {
    app.log.verbose('additional tooling detected');

    // Add the tasks after we init the app
    _.forEach(require('../utils/get-tooling-tasks')(app.config.tooling, app), task => {
      const service = task.service;
      // ensure all v3 services have their appMount set to /app
      const v3Mounts = _(_.get(app, 'info', []))
        .filter(service => service.api !== 4)
        .map(service => ([service.service, service.appMount || '/app']))
        .fromPairs()
        .value();
      app.mounts = _.merge({}, v3Mounts, app.mounts);

      // mix in mount if applicable
      if (!task.dir && _.has(app, `mounts.${service}`)) task.appMount = app.mounts[service];

      // and working dir data if no dir or appMount
      if (!task.dir) {
        const sconf = _.get(app, `config.services.${service}`, {});
        const workdir = sconf?.overrides?.working_dir ?? sconf?.working_dir;
        if (workdir) task.dir = app.config.services[service].working_dir;
      }

      app.log.debug('adding app cli task %s', task.name);
      const injectable = _.has(app, 'engine') ? app : lando;
      app.tasks.push(require('../utils/build-tooling-task')(task, injectable));
    });
  }
};
