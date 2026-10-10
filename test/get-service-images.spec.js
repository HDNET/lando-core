'use strict';

const chai = require('chai');
const expect = chai.expect;

const getServiceImages = require('../utils/get-service-images');

describe('get-service-images', function() {
  it('should return an empty object if there is no compose data', function() {
    expect(getServiceImages()).to.deep.equal({});
    expect(getServiceImages([])).to.deep.equal({});
  });

  it('should collect images from all compose data', function() {
    const composeData = [
      {data: [{services: {appserver: {image: 'php:8.3-fpm'}, database: {image: 'mariadb:10.4'}}}]},
      {data: [{services: {cache: {image: 'redis:7'}}}]},
    ];
    expect(getServiceImages(composeData)).to.deep.equal({
      appserver: 'php:8.3-fpm',
      database: 'mariadb:10.4',
      cache: 'redis:7',
    });
  });

  it('should skip services that have no image', function() {
    const composeData = [{data: [{services: {appserver: {build: '.'}, database: {image: 'mysql:8.0'}}}]}];
    expect(getServiceImages(composeData)).to.deep.equal({database: 'mysql:8.0'});
  });

  it('should let later definitions win', function() {
    const composeData = [
      {data: [{services: {database: {image: 'mysql:5.7'}}}]},
      {data: [{services: {database: {image: 'mysql:8.0'}}}]},
    ];
    expect(getServiceImages(composeData)).to.deep.equal({database: 'mysql:8.0'});
  });

  it('should tolerate malformed compose data', function() {
    expect(getServiceImages([{}, {data: []}, {data: [{}]}, {data: [{services: {}}]}])).to.deep.equal({});
  });
});
