'use strict';

const fs = require('fs');

const stringer = require('./spawn-sync-stringer');

// docker desktops wsl2 integration always mounts itself here, if this is missing we definitely are not on it
const DD_WSL_MOUNT = '/mnt/wsl/docker-desktop';

/*
 * Returns true if the build engine we are talking to is docker desktop
 *
 * This matters on wsl2 because docker desktop proxies "host-gateway" all the way through to the windows host while a
 * docker-ce running inside the distro only ever gets you to the linux side
 */
module.exports = (platform = process.landoPlatform ?? process.platform) => {
  // cheap and definitive negative on wsl
  if (platform === 'wsl' && !fs.existsSync(DD_WSL_MOUNT)) return false;

  // otherwise just ask the daemon
  try {
    const docker = require('./get-docker-x')();
    if (!docker) return false;

    const {status, stdout} = stringer(docker, ['info', '--format', '{{.OperatingSystem}}'], {encoding: 'utf-8'});
    if (status !== 0) return false;

    return stdout.toLowerCase().includes('docker desktop');
  } catch {
    return false;
  }
};
