'use strict';

const chai = require('chai');
const expect = chai.expect;

const getPassthroughCommand = require('../utils/get-passthrough-command');

const tasks = [
  {command: 'start', describe: 'Starts your app'},
  {command: 'db-import <file>', id: 'db-import', passthrough: true},
  {command: 'console', id: 'console', passthrough: true},
];

describe('get-passthrough-command', function() {
  it('should return the command when it is a passthrough', function() {
    expect(getPassthroughCommand(tasks, 'console')).to.equal('console');
  });

  it('should match on id and not on the full command string', function() {
    expect(getPassthroughCommand(tasks, 'db-import')).to.equal('db-import');
  });

  it('should return undefined for one of our own commands', function() {
    expect(getPassthroughCommand(tasks, 'start')).to.equal(undefined);
  });

  it('should return undefined for an unknown command', function() {
    expect(getPassthroughCommand(tasks, 'nope')).to.equal(undefined);
  });

  it('should return undefined when there is no command', function() {
    expect(getPassthroughCommand(tasks)).to.equal(undefined);
    expect(getPassthroughCommand(tasks, '')).to.equal(undefined);
    expect(getPassthroughCommand()).to.equal(undefined);
  });
});
