'use strict';

const chai = require('chai');
const expect = chai.expect;

const getDbServices = require('../utils/get-db-services');
const {getFlavor} = getDbServices;

describe('get-db-services', function() {
  it('should return an empty array if there is no info', function() {
    expect(getDbServices()).to.deep.equal([]);
    expect(getDbServices([])).to.deep.equal([]);
  });

  it('should ignore services that are not databases', function() {
    const info = [{service: 'appserver', type: 'php'}, {service: 'cache', type: 'redis'}];
    expect(getDbServices(info)).to.deep.equal([]);
  });

  it('should detect known database types', function() {
    const info = [
      {service: 'appserver', type: 'php'},
      {service: 'db1', type: 'mysql'},
      {service: 'db2', type: 'mariadb'},
      {service: 'db3', type: 'postgres'},
    ];
    expect(getDbServices(info).map(service => service.service)).to.deep.equal(['db1', 'db2', 'db3']);
  });

  it('should detect prefixed and versioned database types', function() {
    const info = [
      {service: 'db1', type: 'pantheon-mariadb'},
      {service: 'db2', type: 'mysql:8.0'},
      {service: 'db3', type: 'lagoon_postgres'},
    ];
    expect(getDbServices(info).map(service => service.flavor)).to.deep.equal(['mariadb', 'mysql', 'postgres']);
  });

  it('should detect a service called "database" even if its flavor is unknown', function() {
    const info = [{service: 'database', type: 'lando-compose'}];
    expect(getDbServices(info)).to.deep.equal([{service: 'database', type: 'lando-compose', flavor: undefined}]);
  });

  it('should fall back to sniffing the service image', function() {
    const info = [{service: 'db1', type: 'lando'}, {service: 'cache', type: 'lando'}];
    const images = {db1: 'mariadb:10.4', cache: 'redis:7'};
    expect(getDbServices(info, images)).to.deep.equal([{service: 'db1', type: 'lando', flavor: 'mariadb'}]);
  });

  it('should prefer the type over the image when sniffing', function() {
    const info = [{service: 'db1', type: 'postgres'}];
    expect(getDbServices(info, {db1: 'mariadb:10.4'})[0].flavor).to.equal('postgres');
  });

  it('should handle registries and tags in image names', function() {
    expect(getFlavor('bitnami/postgresql:15')).to.equal('postgres');
    expect(getFlavor('mysql:8.0')).to.equal('mysql');
    expect(getFlavor('devwithlando/php:8.3-fpm-2')).to.equal(undefined);
    expect(getFlavor('nginx:1.22.1')).to.equal(undefined);
  });

  it('should not confuse similarly named types', function() {
    expect(getFlavor('mysql-proxy-thing')).to.equal('mysql');
    expect(getFlavor('mysqlish')).to.equal(undefined);
    expect(getFlavor('notmariadb')).to.equal(undefined);
    expect(getFlavor(undefined)).to.equal(undefined);
    expect(getFlavor(42)).to.equal(undefined);
  });
});
