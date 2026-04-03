'use strict';

const _ = require('lodash');

const toArray = value => Array.isArray(value) ? value : [];

module.exports = {
  name: '_lando-compose',
  parent: '_lando',
  builder: parent => class LandoComposeServiceV3 extends parent {
    constructor(id, options = {}) {
      // get the original entrypoint and command from the compose data
      // load-compose-files ensures these are populated from the image if not set in compose
      const composeServices = _.get(options, '_app.composeData[0].data[0].services', {});
      const composeService = _.get(composeServices, options.name, {});

      const originalEntrypoint = toArray(composeService.entrypoint);
      const originalCommand = toArray(composeService.command);

      if (originalEntrypoint.length === 1 &&
        (originalEntrypoint[0] === '/lando-entrypoint.sh' || originalEntrypoint[0] === '/helpers/lando-entrypoint.sh')
      ) {
        options.landoEntrypoint = false;
      }
      const command = [...originalEntrypoint, ...originalCommand];

      const opts = _.merge({}, {
        // let the parent _lando set entrypoint to /lando-entrypoint.sh
        data: null, // NOTE: Do not create the data volume
        dataHome: null, // NOTE: Do not create the dataHome volume
        appMount: '/',
        sslExpose: false,
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
