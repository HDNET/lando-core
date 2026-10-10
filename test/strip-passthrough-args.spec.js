'use strict';

const chai = require('chai');
const expect = chai.expect;

const strip = require('../utils/strip-passthrough-args');

// a tooling command as lando would describe it, roughly our own db-import
const declared = {
  options: {
    'host': {description: 'The database service to use', default: 'database', alias: ['h']},
    'no-wipe': {description: 'Do not wipe', boolean: true},
  },
  positionals: {file: {describe: 'the file'}},
  dynamic: 'host',
};

// what landoArgv() would hand us for "lando -vv db-import ..."
const globals = {_: ['db-import'], $0: 'lando', verbose: 2, debug: undefined};

describe('strip-passthrough-args', function() {
  it('should keep options the command declared', function() {
    const argv = {host: 'db', h: 'db', file: 'dump.sql'};
    const result = strip(argv, {...declared, globals});
    expect(result.host).to.equal('db');
    expect(result.h).to.equal('db');
    expect(result.file).to.equal('dump.sql');
  });

  it('should keep both the kebab and camel forms yargs sets', function() {
    const argv = {'no-wipe': true, 'noWipe': true};
    const result = strip(argv, {...declared, globals});
    expect(result['no-wipe']).to.equal(true);
    expect(result.noWipe).to.equal(true);
  });

  it('should drop args the command did not declare', function() {
    const argv = {'host': 'db', 'autoRemove': false, 'auto-remove': false, 'deps': true, 'coolFlag': true};
    const result = strip(argv, {...declared, globals});
    expect(result).to.not.have.property('autoRemove');
    expect(result).to.not.have.property('auto-remove');
    expect(result).to.not.have.property('deps');
    expect(result).to.not.have.property('coolFlag');
    expect(result.host).to.equal('db');
  });

  it('should keep the structural keys', function() {
    const app = {root: '/app'};
    const argv = {'_': ['db-import', 'dump.sql'], '--': ['-e', 'x'], '$0': 'lando', '_app': app, '_yargs': {}};
    const result = strip(argv, {...declared, globals});
    expect(result._).to.deep.equal(['db-import', 'dump.sql']);
    expect(result['--']).to.deep.equal(['-e', 'x']);
    expect(result._app).to.equal(app);
    expect(result).to.have.property('_yargs');
  });

  it('should take our own global options from the pre command region', function() {
    // -vvv after the command must not win over the -vv before it
    const argv = {verbose: 3, v: 3, host: 'db'};
    const result = strip(argv, {...declared, globals});
    expect(result.verbose).to.equal(2);
  });

  it('should keep unknown flags that came before the command', function() {
    // "lando --deps console foo" still means --deps for us
    const result = strip({deps: true}, {options: {}, globals: {...globals, deps: true}});
    expect(result.deps).to.equal(true);
  });

  it('should keep the dynamic service key even if it was not declared as an option', function() {
    const result = strip({host: 'db'}, {options: {}, dynamic: 'host', globals});
    expect(result.host).to.equal('db');
  });

  it('should cope with being given nothing', function() {
    expect(strip()).to.deep.equal({});
  });
});
