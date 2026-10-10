'use strict';

const {isIP} = require('net');

const stringer = require('./spawn-sync-stringer');

/*
 * Runs a powershell script that is expected to print a single ipv4 address and returns it
 *
 * Requires wsl interop eg the ability to invoke powershell.exe from inside the distro
 */
module.exports = script => {
  try {
    const args = ['-NoProfile', '-NonInteractive', '-Command', script];
    const {status, stdout} = stringer('powershell.exe', args, {encoding: 'utf-8'});
    if (status !== 0) return undefined;

    const ip = stdout.split('\n')[0].trim();
    return isIP(ip) === 4 ? ip : undefined;
  } catch {
    return undefined;
  }
};
