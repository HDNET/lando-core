'use strict';

const chai = require('chai');
const expect = chai.expect;

const getDbToolingDefaults = require('../utils/get-db-tooling-defaults');

describe('get-db-tooling-defaults', function() {
  it('should always provide import, export and a generic shell', function() {
    const tooling = getDbToolingDefaults();
    expect(tooling).to.have.property('db-import <file>');
    expect(tooling).to.have.property('db-export [file]');
    expect(tooling).to.have.property('db');
  });

  it('should point at the scripts core mounts into every api 3 service', function() {
    const tooling = getDbToolingDefaults();
    expect(tooling['db-import <file>'].cmd).to.equal('/helpers/sql-import.sh');
    expect(tooling['db-export [file]'].cmd).to.equal('/helpers/sql-export.sh');
    expect(tooling['db'].cmd).to.equal('/helpers/sql-cli.sh');
  });

  it('should run import and export as root', function() {
    const tooling = getDbToolingDefaults();
    expect(tooling['db-import <file>'].user).to.equal('root');
    expect(tooling['db-export [file]'].user).to.equal('root');
  });

  it('should use a dynamic service that defaults to "database"', function() {
    const tooling = getDbToolingDefaults();
    expect(tooling['db-import <file>'].service).to.equal(':host');
    expect(tooling['db-import <file>'].options.host.default).to.equal('database');
  });

  it('should honor a different default host', function() {
    const tooling = getDbToolingDefaults([{service: 'mydb', flavor: 'mysql'}], 'mydb');
    expect(tooling['db-import <file>'].options.host.default).to.equal('mydb');
    expect(tooling['db-export [file]'].options.host.default).to.equal('mydb');
    expect(tooling['mysql'].options.host.default).to.equal('mydb');
  });

  it('should add a flavor specific shell for each detected flavor', function() {
    const tooling = getDbToolingDefaults([
      {service: 'db1', flavor: 'mariadb'},
      {service: 'db2', flavor: 'postgres'},
    ]);
    expect(tooling).to.have.property('mariadb');
    expect(tooling).to.have.property('psql');
    expect(tooling).to.not.have.property('mysql');
  });

  it('should not add a shell for undetectable or unsupported flavors', function() {
    const tooling = getDbToolingDefaults([{service: 'database'}, {service: 'db2', flavor: 'mssql'}]);
    expect(tooling).to.have.property('db');
    expect(tooling).to.not.have.property('mysql');
    expect(tooling).to.not.have.property('mssql');
  });

  it('should not mutate shared option objects between commands', function() {
    const tooling = getDbToolingDefaults([{service: 'database', flavor: 'mysql'}]);
    expect(tooling['db-import <file>'].options).to.have.property('no-wipe');
    expect(tooling['db-export [file]'].options).to.not.have.property('no-wipe');
    expect(tooling['db'].options).to.not.have.property('no-wipe');
    expect(tooling['mysql'].options).to.not.have.property('stdout');
  });
});
