'use strict';

const chai = require('chai');
const expect = chai.expect;

const addDbTooling = require('../hooks/app-add-db-tooling');

// minimal app stub
const getApp = (info = [], tooling = {}) => ({
  info,
  config: {tooling},
  _coreDbTooling: {},
  log: {verbose: () => {}},
});

describe('app-add-db-tooling', function() {
  it('should do nothing if there is no database service', async function() {
    const app = getApp([{service: 'appserver', type: 'php'}]);
    await addDbTooling(app);
    expect(app.config.tooling).to.deep.equal({});
    expect(app._coreDbTooling).to.deep.equal({});
  });

  it('should add default tooling when it finds a database', async function() {
    const app = getApp([{service: 'database', type: 'mysql'}]);
    await addDbTooling(app);
    expect(app.config.tooling).to.have.property('db-import <file>');
    expect(app.config.tooling).to.have.property('db-export [file]');
    expect(app.config.tooling).to.have.property('mysql');
    expect(app._coreDbTooling).to.have.property('db-import <file>');
  });

  it('should default the host to the found service when it is not called "database"', async function() {
    const app = getApp([{service: 'mydb', type: 'postgres'}]);
    await addDbTooling(app);
    expect(app.config.tooling['db-import <file>'].options.host.default).to.equal('mydb');
    expect(app.config.tooling).to.have.property('psql');
  });

  it('should prefer a service called "database" as the default host', async function() {
    const app = getApp([{service: 'mydb', type: 'mysql'}, {service: 'database', type: 'mysql'}]);
    await addDbTooling(app);
    expect(app.config.tooling['db-import <file>'].options.host.default).to.equal('database');
  });

  it('should not clobber tooling the user or recipe already declared', async function() {
    const existing = {'db-import <file>': {service: 'database', cmd: 'my-importer'}};
    const app = getApp([{service: 'database', type: 'mysql'}], existing);
    await addDbTooling(app);
    expect(app.config.tooling['db-import <file>'].cmd).to.equal('my-importer');
    expect(app._coreDbTooling).to.not.have.property('db-import <file>');
  });

  it('should match claimed tooling on id and not on key', async function() {
    // a user declaring a plain "db-import" should not end up with two of them
    const app = getApp([{service: 'database', type: 'mysql'}], {'db-import': {service: 'database', cmd: 'nope'}});
    await addDbTooling(app);
    expect(app.config.tooling).to.not.have.property('db-import <file>');
    expect(app.config.tooling).to.have.property('db-import');
  });

  it('should respect tooling that has been disabled', async function() {
    const app = getApp([{service: 'database', type: 'mysql'}], {mysql: false});
    await addDbTooling(app);
    expect(app.config.tooling.mysql).to.equal(false);
    expect(app._coreDbTooling).to.not.have.property('mysql');
  });
});
