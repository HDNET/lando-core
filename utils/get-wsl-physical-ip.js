'use strict';

const {isIP} = require('net');

const stringer = require('./spawn-sync-stringer');

/*
 * Returns the wsl2 vms _own_ physical ip eg the source address it uses for outbound traffic
 *
 * This is only useful as a fallback, it gets containers to the wsl2 side of things but never to windows
 */
module.exports = () => {
  try {
    const {status, stdout} = stringer('ip', ['-4', 'route', 'get', '1.1.1.1'], {encoding: 'utf-8'});
    if (status !== 0) return undefined;

    // output looks like "1.1.1.1 via 10.0.0.1 dev eth0 src 10.0.0.42 uid 1000"
    const parts = stdout.split(/\s+/);
    const ip = parts[parts.indexOf('src') + 1];
    return isIP(ip) === 4 ? ip : undefined;
  } catch {
    return undefined;
  }
};
