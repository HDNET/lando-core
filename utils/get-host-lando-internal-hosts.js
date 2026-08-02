'use strict';

const path = require('path');

/*
 * Returns the docker compose "extra_hosts" list that maps host.lando.internal at whatever the users machine actually
 * lives at, returns an empty list if we could not work that out eg wsl2 with networking disabled
 *
 * Prefers the value resolved at bootstrap but falls back to resolving it directly, get-host-lando-internal memoizes
 * so the fallback is cheap
 */
module.exports = lando => {
  const resolved = lando?.config?.hostLandoInternal ?? require('./get-host-lando-internal')({
    cacheDir: lando?.config?.userConfRoot ? path.join(lando.config.userConfRoot, 'cache') : undefined,
    ideLocation: lando?.config?.xdebugIdeLocation,
  });

  return [`host.lando.internal:${resolved.extraHost}`];
};
