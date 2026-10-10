'use strict';

const fs = require('fs');

const getWinEnvar = require('./get-win32-envvar-from-wsl');
const wslpath = require('./winpath-2-wslpath');

/*
 * Locates the users windows side .wslconfig, returns undefined if we cannot find it
 */
const getWslConfigPath = () => {
  try {
    const userProfile = process.env.USERPROFILE ?? getWinEnvar('USERPROFILE');
    if (!userProfile) return undefined;

    const configPath = `${wslpath(userProfile)}/.wslconfig`;
    return fs.existsSync(configPath) ? configPath : undefined;
  } catch {
    return undefined;
  }
};

/*
 * Returns true if hostAddressLoopback=true is set under [experimental] in the users .wslconfig
 *
 * Mirrored networking mode needs this in order for anything inside wsl2 to be able to connect back to a listener on
 * the windows host
 */
module.exports = () => {
  const configPath = getWslConfigPath();
  if (!configPath) return false;

  let contents;
  try {
    contents = fs.readFileSync(configPath, {encoding: 'utf-8'});
  } catch {
    return false;
  }

  let experimental = false;

  for (const raw of contents.split('\n')) {
    const line = raw.trim().replace(/\r$/, '');

    // skip comments and empties
    if (line === '' || line.startsWith('#') || line.startsWith(';')) continue;

    // track sections
    if (line.startsWith('[') && line.endsWith(']')) {
      experimental = line.slice(1, -1).trim().toLowerCase() === 'experimental';
      continue;
    }

    if (!experimental) continue;

    const [key, value] = line.split('=');
    if (typeof value !== 'string') continue;
    if (key.trim().toLowerCase() === 'hostaddressloopback' && value.trim().toLowerCase() === 'true') return true;
  }

  return false;
};
