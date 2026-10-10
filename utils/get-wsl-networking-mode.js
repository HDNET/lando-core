'use strict';

const stringer = require('./spawn-sync-stringer');

// the modes wsl currently knows about
// @see https://learn.microsoft.com/en-us/windows/wsl/wsl-config#configuration-settings-for-wslconfig
const MODES = ['nat', 'mirrored', 'virtioproxy', 'none', 'bridged'];

/*
 * Returns the networking mode of the wsl2 vm we are running in eg nat|mirrored|virtioproxy|none|bridged
 *
 * Returns undefined if we cannot determine it, note that `wslinfo` only exists on newer wsl releases so on older
 * ones the caller should assume "nat" because that was the only option back then
 */
module.exports = () => {
  try {
    const {status, stdout} = stringer('wslinfo', ['--networking-mode'], {encoding: 'utf-8'});
    if (status !== 0) return undefined;

    const mode = stdout.toLowerCase();
    return MODES.includes(mode) ? mode : undefined;
  } catch {
    return undefined;
  }
};
