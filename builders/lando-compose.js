'use strict';

const _ = require('lodash');

module.exports = {
  name: 'lando-compose',
  api: 3,
  parent: '_lando',
  builder: parent => class LandoComposeServiceV3 extends parent {
    constructor(id, options = {}) {
      super(id, _.merge({}, {
        entrypoint: null, // NOTE: Do not overwrite the entrypoint from docker compose. Or should we?
        data: null, // NOTE: Do not create the data volume
        dataHome: null, // NOTE: Do not create the dataHome volume
        appMount: '/',
        sslExpose: false,
        ssl: true,
      }, options));
    }
  },
};
