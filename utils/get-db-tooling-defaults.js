'use strict';

const _ = require('lodash');

// map of database flavors to the shell command we should add for them
const shells = {
  mariadb: {command: 'mariadb', description: 'Drops into a MariaDB shell on a database service'},
  mysql: {command: 'mysql', description: 'Drops into a MySQL shell on a database service'},
  postgres: {command: 'psql', description: 'Drops into a PostgreSQL shell on a database service'},
};

/*
 * Helper to get the default database tooling
 *
 * This is the same tooling every recipe has historically had to redeclare for itself. The scripts it points at
 * are provided by this plugin and mounted into every api 3 service at /helpers.
 */
module.exports = (services = [], host = 'database') => {
  const hostOption = {
    host: {
      description: 'The database service to use',
      default: host,
      alias: ['h'],
    },
  };

  const tooling = {
    'db-import <file>': {
      service: ':host',
      description: 'Imports a dump file into a database service',
      cmd: '/helpers/sql-import.sh',
      user: 'root',
      options: _.merge({}, hostOption, {
        'no-wipe': {
          description: 'Do not destroy the existing database before an import',
          boolean: true,
        },
      }),
    },
    'db-export [file]': {
      service: ':host',
      description: 'Exports database from a database service to a file',
      cmd: '/helpers/sql-export.sh',
      user: 'root',
      options: _.merge({}, hostOption, {
        stdout: {
          description: 'Dump database to stdout',
        },
      }),
    },
    'db': {
      service: ':host',
      description: 'Drops into a database shell on a database service',
      cmd: '/helpers/sql-cli.sh',
      options: _.merge({}, hostOption),
    },
  };

  // add a flavor specific shell eg "lando mysql" for each flavor we were able to detect
  _(services)
    .map('flavor')
    .filter(flavor => _.has(shells, flavor))
    .uniq()
    .forEach(flavor => {
      tooling[shells[flavor].command] = {
        service: ':host',
        description: shells[flavor].description,
        cmd: '/helpers/sql-cli.sh',
        options: _.merge({}, hostOption),
      };
    });

  return tooling;
};
