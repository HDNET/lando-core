'use strict';

const chai = require('chai');
const expect = chai.expect;

const Cli = require('../lib/cli');

// helper to run something with a faked process.argv
const withArgv = (args, fn) => {
  const original = process.argv;
  process.argv = ['/usr/local/bin/node', '/usr/local/bin/lando', ...args];
  try {
    return fn();
  } finally {
    process.argv = original;
  }
};

describe('cli.landoArgv', function() {
  it('should fall back to argv() when the command is not a passthrough', function() {
    const cli = new Cli();
    withArgv(['info', '-vvv'], () => {
      // no passthrough set, so we should get whatever the normal parse gives us
      expect(cli.landoArgv()).to.deep.equal(cli.argv());
    });
  });

  it('should ignore verbosity that comes after a passthrough command', function() {
    const cli = new Cli();
    cli.passthrough = 'console';
    withArgv(['console', 'my:command', '-vvv'], () => {
      expect(cli.landoArgv().verbose).to.equal(0);
    });
  });

  it('should claim verbosity that comes before a passthrough command', function() {
    const cli = new Cli();
    cli.passthrough = 'console';
    withArgv(['-vvv', 'console', 'my:command'], () => {
      expect(cli.landoArgv().verbose).to.equal(3);
    });
  });

  it('should count --verbose and -v the same way yargs does', function() {
    const cli = new Cli();
    cli.passthrough = 'console';
    withArgv(['--verbose', '-v', 'console', 'my:command'], () => {
      expect(cli.landoArgv().verbose).to.equal(2);
    });
  });

  it('should ignore --debug that comes after a passthrough command', function() {
    const cli = new Cli();
    cli.passthrough = 'console';
    withArgv(['console', 'my:command', '--debug'], () => {
      expect(cli.landoArgv().debug).to.equal(undefined);
    });
    withArgv(['--debug', 'console', 'my:command'], () => {
      expect(cli.landoArgv().debug).to.equal(true);
    });
  });

  it('should not choke on a valued global option before the command', function() {
    const cli = new Cli();
    cli.passthrough = 'console';
    withArgv(['--channel', 'edge', '-vv', 'console', 'my:command', '-vvv'], () => {
      expect(cli.landoArgv().verbose).to.equal(2);
    });
  });

  it('should fall back to argv() if the command cannot be found in argv', function() {
    const cli = new Cli();
    cli.passthrough = 'nope';
    withArgv(['console', 'my:command'], () => {
      expect(cli.landoArgv()).to.deep.equal(cli.argv());
    });
  });

  it('should ignore globals that follow the command, bare -- or not', function() {
    const cli = new Cli();
    cli.passthrough = 'l4env';
    withArgv(['l4env', '--debug', '--', 'env'], () => {
      expect(cli.landoArgv().debug).to.equal(undefined);
    });
    withArgv(['l4env', '--', 'env', '--debug'], () => {
      expect(cli.landoArgv().debug).to.equal(undefined);
    });
  });

  it('should report zero verbosity when nothing precedes the command', function() {
    const cli = new Cli();
    cli.passthrough = 'console';
    withArgv(['console'], () => {
      expect(cli.landoArgv().verbose).to.equal(0);
      expect(cli.landoArgv().debug).to.equal(undefined);
    });
  });
});
