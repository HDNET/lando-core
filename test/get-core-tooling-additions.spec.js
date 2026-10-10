'use strict';

const chai = require('chai');
const expect = chai.expect;

const getAdditions = require('../utils/get-core-tooling-additions');

describe('get-core-tooling-additions', function() {
  const core = {'db-import <file>': {cmd: 'core-importer'}, 'db': {cmd: 'core-shell'}};

  it('should return everything if nothing is claimed', function() {
    expect(getAdditions(core, {})).to.deep.equal(core);
    expect(getAdditions(core)).to.deep.equal(core);
  });

  it('should handle being given nothing', function() {
    expect(getAdditions()).to.deep.equal({});
  });

  it('should drop commands claimed under the same key', function() {
    const additions = getAdditions(core, {'db-import <file>': {cmd: 'mine'}});
    expect(additions).to.not.have.property('db-import <file>');
    expect(additions).to.have.property('db');
  });

  it('should drop commands claimed under a different key but the same id', function() {
    const additions = getAdditions(core, {'db-import': {cmd: 'mine'}});
    expect(additions).to.not.have.property('db-import <file>');
  });

  it('should drop commands the user has disabled', function() {
    expect(getAdditions(core, {db: false})).to.not.have.property('db');
  });

  it('should never deep merge into a claimed command', function() {
    const tooling = {'db-import <file>': {cmd: 'mine'}};
    const merged = Object.assign({}, getAdditions(core, tooling), tooling);
    expect(merged['db-import <file>']).to.deep.equal({cmd: 'mine'});
  });
});
