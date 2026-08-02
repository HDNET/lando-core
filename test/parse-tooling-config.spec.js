'use strict';

const chai = require('chai');
const expect = chai.expect;

const parseToolingConfig = require('../utils/parse-tooling-config');

// options as they would be declared by a dynamic service tooling command
const options = {host: {description: 'The database service to use', default: 'database', alias: ['h']}};

describe('parse-tooling-config', function() {
  it('should resolve a dynamic service from the answers', function() {
    const answers = {host: 'database', h: 'database', _eventArgs: ['node', 'lando', 'db']};
    const config = parseToolingConfig(['/helpers/sql-cli.sh'], ':host', 'db', options, answers, {database: 3});
    expect(config[0].service).to.equal('database');
    expect(config[0].sapi).to.equal(3);
  });

  it('should strip the dynamic service option and its value from the args', function() {
    const answers = {
      host: 'database',
      h: 'database',
      _eventArgs: ['node', 'lando', 'mysql', '--host', 'database', '--', '-e', 'SELECT 1'],
    };
    const config = parseToolingConfig(['/helpers/sql-cli.sh'], ':host', 'mysql', options, answers, {database: 3});
    expect(config[0].args).to.deep.equal(['--', '-e', 'SELECT 1']);
  });

  it('should not strip the command name when it matches the resolved service', function() {
    // "lando db" on a service that is also called "db" used to remove its own command name from argv, which
    // meant every arg including the node and lando binaries got passed through to the underlying command
    const answers = {host: 'db', h: 'db', _eventArgs: ['node', 'lando', 'db', '--', '-e', 'SELECT 1']};
    const config = parseToolingConfig(['/helpers/sql-cli.sh'], ':host', 'db', options, answers, {db: 3});
    expect(config[0].service).to.equal('db');
    expect(config[0].args).to.deep.equal(['--', '-e', 'SELECT 1']);
    expect(config[0].args).to.not.include('node');
    expect(config[0].args).to.not.include('lando');
  });

  it('should still strip the dynamic service option when the command name matches the service', function() {
    const answers = {host: 'db', h: 'db', _eventArgs: ['node', 'lando', 'db', '-h', 'db', '--', '-e', 'SELECT 1']};
    const config = parseToolingConfig(['/helpers/sql-cli.sh'], ':host', 'db', options, answers, {db: 3});
    expect(config[0].args).to.deep.equal(['--', '-e', 'SELECT 1']);
  });

  it('should leave non dynamic services alone', function() {
    const answers = {_eventArgs: ['node', 'lando', 'composer', 'install']};
    const config = parseToolingConfig(['composer'], 'appserver', 'composer', {}, answers, {appserver: 3});
    expect(config[0].service).to.equal('appserver');
    expect(config[0].args).to.deep.equal(['install']);
  });
});
