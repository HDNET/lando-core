'use strict';

const {isIP} = require('net');

const stringer = require('./spawn-sync-stringer');

/*
 * Returns the windows host ip as seen from inside a wsl2 vm running in "nat" networking mode
 *
 * In nat mode the default gateway of the wsl2 vm _is_ the windows host eg the ip of the "vEthernet (WSL)" adapter
 * on the windows side, this is the address a container needs in order to reach something listening on windows
 *
 * @see https://learn.microsoft.com/en-us/windows/wsl/networking#accessing-windows-networking-apps-from-linux-host-ip
 */
module.exports = () => {
  try {
    const {status, stdout} = stringer('ip', ['-4', 'route', 'show', 'default'], {encoding: 'utf-8'});
    if (status !== 0) return undefined;

    // output looks like "default via 172.28.128.1 dev eth0 proto kernel"
    const ip = stdout.split(/\s+/)[2];
    return isIP(ip) === 4 ? ip : undefined;
  } catch {
    return undefined;
  }
};
