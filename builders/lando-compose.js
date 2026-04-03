'use strict';

const _ = require('lodash');

const toArray = value => Array.isArray(value) ? value : [];

module.exports = {
  name: 'lando-compose',
  api: 3,
  parent: '_lando',
  builder: parent => class LandoComposeServiceV3 extends parent {
    constructor(id, options = {}) {
      // get the original entrypoint and command from the compose data
      // load-compose-files ensures these are populated from the image if not set in compose
      const composeServices = _.get(options, '_app.composeData[0].data[0].services', {});
      const composeService = _.get(composeServices, options.name, {});

      const originalEntrypoint = toArray(composeService.entrypoint);
      const originalCommand = toArray(composeService.command);
      const composeWorkingDir = composeService.working_dir || null;

      if (originalEntrypoint.length === 1 &&
        (originalEntrypoint[0] === '/lando-entrypoint.sh' || originalEntrypoint[0] === '/helpers/lando-entrypoint.sh')
      ) {
        options.landoEntrypoint = false;
      }
      const command = [...originalEntrypoint, ...originalCommand];

      // If appMount is not explicitly set in options, use the compose working_dir (which
      // load-compose-files resolves from the image if not set in compose), falling back to '/'
      const appMount = options.appMount ?? composeWorkingDir ?? '/';

      const opts = _.merge({}, {
        // let the parent _lando set entrypoint to /lando-entrypoint.sh
        data: null, // NOTE: Do not create the data volume
        dataHome: null, // NOTE: Do not create the dataHome volume
        appMount,
        sslExpose: false,
        ssl: true,
      }, options);

      if ((options.landoEntrypoint ?? true) && command.length > 0) {
        opts.overrides = _.merge({}, {command}, options.overrides);
      } else {
        opts.entrypoint = undefined;
      }

      super(id, opts);
    }
  },
};
