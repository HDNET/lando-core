'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {isIP} = require('net');

const Cache = require('../lib/cache');
const debug = require('debug')('@lando/host-lando-internal');

// the cache is invalidated on this so we only pay for the expensive powershell lookups once per wsl boot
const getBootID = () => {
  try {
    return fs.readFileSync('/proc/sys/kernel/random/boot_id', {encoding: 'utf-8'}).trim();
  } catch {
    return 'unknown';
  }
};

/*
 * Works out what "host.lando.internal" needs to point at so that things inside a container can reach things that are
 * listening on the users machine eg an xdebug listener in their ide
 *
 * This is a port of how ddev handles the same problem
 * @see https://github.com/ddev/ddev/blob/master/pkg/dockerutil/host_docker_internal.go
 *
 * @param {String} ideLocation one of "wsl2", "container", an ip address or falsy for autodetection
 * @return {Object} {extraHost, ip, mode, message} where extraHost is what to feed docker compose extra_hosts
 */
const resolve = ideLocation => {
  // 1. the user has told us exactly where to go
  if (isIP(ideLocation)) {
    return {extraHost: ideLocation, ip: ideLocation, message: `ideLocation is the ip ${ideLocation}`};
  }

  // 2. the ide is listening inside the container itself eg a vscode language server style setup
  if (ideLocation === 'container') {
    return {extraHost: '127.0.0.1', ip: '127.0.0.1', message: 'ideLocation is "container"'};
  }

  // 3. everywhere that is not wsl2, host-gateway does the right thing on linux, docker desktop and colima
  if (!os.release().toLowerCase().includes('microsoft')) {
    return {extraHost: 'host-gateway', message: 'not wsl2 so host-gateway is fine'};
  }

  // 4. the ide is running inside wsl2 as well, that is just normal linux behavior
  if (ideLocation === 'wsl2') {
    return {extraHost: 'host-gateway', mode: 'wsl2', message: 'ideLocation is "wsl2" so host-gateway is fine'};
  }

  // 5. docker desktop proxies host-gateway through to the windows host for us so there is nothing to do
  if (require('./is-docker-desktop')('wsl')) {
    return {extraHost: 'host-gateway', mode: 'wsl2', message: 'wsl2 with docker desktop so host-gateway is fine'};
  }

  // from here on out we assume docker is running _inside_ wsl2 and the ide is on windows, host-gateway would only
  // ever get us as far as the linux side of the fence so we need to find the windows host ourselves

  // @NOTE: wslinfo does not exist on older wsl releases and nat was the only mode back then
  const mode = require('./get-wsl-networking-mode')() ?? 'nat';

  switch (mode) {
    // no network bridge at all, there is no internet and no path to windows, nothing we can do here
    case 'none':
      return {extraHost: 'host-gateway', mode, message: 'wsl2 networkingMode=none, there is no network path to the windows host'};

    // wsl2 shares the windows network namespace so ask windows for its own reachable address
    // @NOTE: we also send bridged down this path, in bridged mode the default gateway is the physical router rather
    // than windows so the nat lookup below would be flat out wrong
    case 'mirrored':
    case 'bridged': {
      const ip = require('./get-wsl-mirrored-host-ip')();
      if (!ip) {
        return {
          extraHost: 'host-gateway',
          mode,
          message: `wsl2 networkingMode=${mode} but we could not determine the windows host ip`,
        };
      }

      const loopback = mode === 'mirrored' && !require('./is-wsl-host-loopback-enabled')();
      const caveat = loopback ? ', note that hostAddressLoopback=true is NOT set in .wslconfig' : '';
      return {extraHost: ip, ip, mode, message: `wsl2 networkingMode=${mode} windows host is ${ip}${caveat}`};
    }

    // the default gateway is the network router so we need the hyper-v virtual switch that joins windows to wsl2
    case 'virtioproxy': {
      const ip = require('./get-wsl-virtioproxy-host-ip')();
      if (ip) return {extraHost: ip, ip, mode, message: `wsl2 networkingMode=virtioproxy windows host is ${ip}`};

      // no hyper-v virtual switch, common on arm64 windows. fall back to wsl2s own ip so that host.lando.internal at
      // least resolves, that gets an ide running inside wsl2 working but never one on windows
      const fallback = require('./get-wsl-physical-ip')();
      const message = 'wsl2 networkingMode=virtioproxy but there is no "vEthernet (WSL)" hyper-v switch, a windows '
        + 'side ide cannot be reached. run your ide inside wsl2 instead and set xdebugIdeLocation: wsl2';
      return fallback ? {extraHost: fallback, ip: fallback, mode, message} : {mode, message};
    }

    // nat, the default. the wsl2 default gateway _is_ the windows host eg the "vEthernet (WSL)" adapter
    default: {
      const ip = require('./get-wsl-nat-host-ip')();
      if (!ip) return {mode, message: 'wsl2 networkingMode=nat but we could not determine the windows host ip'};
      return {extraHost: ip, ip, mode, message: `wsl2 networkingMode=nat windows host is ${ip}`};
    }
  }
};

/*
 * @param {Object} [opts]
 * @param {Object} [opts.cache] a lando cache eg lando.cache, one is created from cacheDir if not passed in
 * @param {String} [opts.cacheDir] where to put the file cache if we need to make our own cache
 * @param {String} [opts.ideLocation] one of "wsl2", "container", an ip address or falsy for autodetection
 * @param {Boolean} [opts.refresh] ignore whatever is cached and resolve again
 * @return {Object} see resolve() above
 */
module.exports = ({cache, cacheDir = path.join(os.homedir(), '.lando', 'cache'), ideLocation, refresh = false} = {}) => {
  // normalize a few falsy-ish things the user might put in their config
  if (!ideLocation || ideLocation === 'auto') ideLocation = undefined;

  // resolution is free outside of wsl2 so there is nothing worth caching
  if (!os.release().toLowerCase().includes('microsoft') || isIP(ideLocation) || ideLocation === 'container') {
    return resolve(ideLocation);
  }

  // otherwise we cache because we would otherwise pay for a powershell spawn on every single lando command
  cache = cache ?? new Cache({cacheDir});
  const key = `_.host-lando-internal.${ideLocation ?? 'auto'}`;

  // the cache is invalidated by boot id because the windows host ip can only really change when the wsl2 vm restarts
  const bootID = getBootID();
  const cached = refresh ? undefined : cache.get(key);
  if (cached && cached.bootID === bootID) {
    debug('using cached %o', cached.result);
    return cached.result;
  }

  const result = resolve(ideLocation);
  debug('resolved host.lando.internal to %o because %s', result.extraHost, result.message);
  cache.set(key, {bootID, result}, {persist: true});

  return result;
};
