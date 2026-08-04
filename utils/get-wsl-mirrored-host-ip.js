'use strict';

const getWinIP = require('./get-win32-ip-from-wsl');

/*
 * In mirrored mode the wsl2 vm shares the windows network namespace so there is no gateway that points at windows,
 * instead we ask windows which of its own addresses is the one a container should be able to reach
 *
 * Rather than scanning every interface we
 *
 *   1. find the best default route (0.0.0.0/0) by RouteMetric/InterfaceMetric
 *   2. take that routes InterfaceIndex
 *   3. return the first non link local, non loopback ipv4 on that interface
 *
 * @NOTE: this also requires hostAddressLoopback=true in the users .wslconfig, see is-wsl-host-loopback-enabled
 */
const SCRIPT = `
$bestRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
  Where-Object { $_.NextHop -ne '0.0.0.0' } |
  Sort-Object -Property RouteMetric, InterfaceMetric |
  Select-Object -First 1

if (-not $bestRoute) {
  return
}

Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $bestRoute.InterfaceIndex -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -and
    $_.IPAddress -notlike '169.254*' -and
    $_.IPAddress -ne '127.0.0.1'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress
`;

module.exports = () => getWinIP(SCRIPT);
