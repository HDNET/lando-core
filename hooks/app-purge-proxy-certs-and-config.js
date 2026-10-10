'use strict';

const fs = require('fs');
const path = require('path');
const remove = require('../utils/remove');

module.exports = async (app, lando) => {
  const certsDir = path.join(lando.config.userConfRoot, 'certs');
  const proxyConfigDir = lando.config.proxyConfigDir;

  for (const dir of [certsDir, proxyConfigDir]) {
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir)
      .filter(f => f.includes(`.${app.project}.`))
      .forEach(f => {
        try {
          remove(path.join(dir, f));
          app.log.debug('removed proxy cert/config %s', f);
        } catch {
          app.log.debug('could not remove proxy cert/config %s', f);
        }
      });
  }
};
