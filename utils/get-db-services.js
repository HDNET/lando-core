'use strict';

const _ = require('lodash');

/*
 * Helper to get the database "flavor" from a service type or image
 *
 * We tokenize instead of matching the whole string because recipes routinely prefix their service types
 * eg "pantheon-mariadb" or suffix them with a version eg "mysql:8.0", and because images come with registries
 * and tags attached eg "bitnami/postgresql:15"
 */
const getFlavor = value => {
  if (typeof value !== 'string') return undefined;
  const tokens = value.toLowerCase().split(/[-_:/]/);
  if (_.includes(tokens, 'mariadb')) return 'mariadb';
  if (_.includes(tokens, 'mysql')) return 'mysql';
  if (!_.isEmpty(_.intersection(tokens, ['postgres', 'postgresql', 'pgsql']))) return 'postgres';
  if (_.includes(tokens, 'mssql')) return 'mssql';
  return undefined;
};

/*
 * Helper to find any services that look like they could be a database
 *
 * We consider a service to be a database if its type is a known database eg "mysql", if its image looks like a
 * known database eg "mariadb:10.4", or if it is literally called "database". The last two are mostly so services
 * that come from an external compose file still get the default database tooling.
 */
module.exports = (info = [], images = {}) => _(info)
  .map(service => ({
    service: service.service,
    type: service.type,
    flavor: getFlavor(service.type) ?? getFlavor(images[service.service]),
  }))
  .filter(service => service.flavor !== undefined || service.service === 'database')
  .value();

module.exports.getFlavor = getFlavor;
