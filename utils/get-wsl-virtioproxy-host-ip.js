'use strict';

const getWinIP = require('./get-win32-ip-from-wsl');

/*
 * In virtioproxy mode the default gateway is the actual network router and not the windows host so we need the ip of
 * the "vEthernet (WSL)" hyper-v virtual switch instead
 *
 * @NOTE: this switch does not exist on every machine eg arm64 windows, in that case this returns undefined and a
 * windows side ide simply is not reachable
 */
const SCRIPT = `Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceAlias -like 'vEthernet (WSL*' } |
  Select-Object -First 1 -ExpandProperty IPAddress`;

module.exports = () => getWinIP(SCRIPT);
