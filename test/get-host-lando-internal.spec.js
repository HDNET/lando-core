/*
 * Tests for get-host-lando-internal.
 * @file get-host-lando-internal.spec.js
 */

'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const expect = chai.expect;
chai.should();

const MODULE = '../utils/get-host-lando-internal';

// the sub utils we need to fake in order to exercise the wsl2 branches
const STUBBABLE = {
  isDockerDesktop: '../utils/is-docker-desktop',
  mode: '../utils/get-wsl-networking-mode',
  natIP: '../utils/get-wsl-nat-host-ip',
  mirroredIP: '../utils/get-wsl-mirrored-host-ip',
  virtioIP: '../utils/get-wsl-virtioproxy-host-ip',
  physicalIP: '../utils/get-wsl-physical-ip',
  loopback: '../utils/is-wsl-host-loopback-enabled',
};

const originalRelease = os.release;

// stuffs a fake module into the require cache, the resolver requires these lazily so this works
const stub = (id, value) => {
  const resolved = require.resolve(id);
  require.cache[resolved] = {id: resolved, filename: resolved, loaded: true, exports: () => value};
};

const unstub = id => delete require.cache[require.resolve(id)];

// each test gets a throwaway cachedir so the on disk boot-id cache cannot leak between them
const getCacheDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hli-'));

const getHostLandoInternal = opts => require(MODULE)({cacheDir: getCacheDir(), refresh: true, ...opts});

describe('get-host-lando-internal', () => {
  afterEach(() => {
    os.release = originalRelease;
    Object.values(STUBBABLE).forEach(unstub);
  });

  describe('explicit ideLocation', () => {
    it('should use an explicit ip address as-is', () => {
      const result = getHostLandoInternal({ideLocation: '192.168.1.50'});
      expect(result.extraHost).to.equal('192.168.1.50');
      expect(result.ip).to.equal('192.168.1.50');
    });

    it('should use loopback when the ide is in the container', () => {
      const result = getHostLandoInternal({ideLocation: 'container'});
      expect(result.extraHost).to.equal('127.0.0.1');
      expect(result.ip).to.equal('127.0.0.1');
    });
  });

  describe('not wsl2', () => {
    it('should use host-gateway', () => {
      os.release = () => '23.5.0';
      expect(getHostLandoInternal().extraHost).to.equal('host-gateway');
    });
  });

  describe('wsl2', () => {
    beforeEach(() => {
      os.release = () => '5.15.153.1-microsoft-standard-WSL2';
    });

    it('should use host-gateway when the ide is also in wsl2', () => {
      const result = getHostLandoInternal({ideLocation: 'wsl2'});
      expect(result.extraHost).to.equal('host-gateway');
    });

    it('should use host-gateway when docker desktop is in play', () => {
      stub(STUBBABLE.isDockerDesktop, true);
      expect(getHostLandoInternal().extraHost).to.equal('host-gateway');
    });

    it('should use the default gateway in nat mode', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'nat');
      stub(STUBBABLE.natIP, '172.28.128.1');

      const result = getHostLandoInternal();
      expect(result.extraHost).to.equal('172.28.128.1');
      expect(result.mode).to.equal('nat');
    });

    it('should assume nat when wslinfo is unavailable', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, undefined);
      stub(STUBBABLE.natIP, '172.28.128.1');

      expect(getHostLandoInternal().extraHost).to.equal('172.28.128.1');
    });

    it('should ask windows for a reachable ip in mirrored mode', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'mirrored');
      stub(STUBBABLE.mirroredIP, '10.1.2.3');
      stub(STUBBABLE.loopback, true);

      const result = getHostLandoInternal();
      expect(result.extraHost).to.equal('10.1.2.3');
      expect(result.message).to.not.contain('hostAddressLoopback');
    });

    it('should call out a missing hostAddressLoopback in mirrored mode', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'mirrored');
      stub(STUBBABLE.mirroredIP, '10.1.2.3');
      stub(STUBBABLE.loopback, false);

      expect(getHostLandoInternal().message).to.contain('hostAddressLoopback');
    });

    it('should use the windows reachable ip in bridged mode', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'bridged');
      stub(STUBBABLE.mirroredIP, '10.1.2.3');

      expect(getHostLandoInternal().extraHost).to.equal('10.1.2.3');
    });

    it('should use the hyper-v switch in virtioproxy mode', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'virtioproxy');
      stub(STUBBABLE.virtioIP, '172.20.0.1');

      expect(getHostLandoInternal().extraHost).to.equal('172.20.0.1');
    });

    it('should fall back to the wsl2 ip when there is no hyper-v switch', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'virtioproxy');
      stub(STUBBABLE.virtioIP, undefined);
      stub(STUBBABLE.physicalIP, '10.0.0.42');

      const result = getHostLandoInternal();
      expect(result.extraHost).to.equal('10.0.0.42');
      expect(result.message).to.contain('xdebugIdeLocation: wsl2');
    });

    it('should still fall back to host-gateway when networking is disabled', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'none');

      const result = getHostLandoInternal();
      expect(result.extraHost).to.equal('host-gateway');
      expect(result.mode).to.equal('none');
    });

    it('should give up when we cannot determine the windows ip', () => {
      stub(STUBBABLE.isDockerDesktop, false);
      stub(STUBBABLE.mode, 'nat');
      stub(STUBBABLE.natIP, undefined);

      expect(getHostLandoInternal().extraHost).to.be.undefined;
    });
  });
});

describe('get-host-lando-internal-hosts', () => {
  const getHosts = require('../utils/get-host-lando-internal-hosts');

  it('should build an extra_hosts entry from the resolved value', () => {
    const lando = {config: {hostLandoInternal: {extraHost: '172.28.128.1'}}};
    expect(getHosts(lando)).to.deep.equal(['host.lando.internal:172.28.128.1']);
  });

  it('should build an entry even when there is no resolved extraHost', () => {
    const lando = {config: {hostLandoInternal: {message: 'nope'}}};
    expect(getHosts(lando)).to.deep.equal(['host.lando.internal:undefined']);
  });
});
