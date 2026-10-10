'use strict';

const path = require('path');

const combinedFile = 'docker-compose.yml';

/*
 * Dumps a single fully rendered compose file next to the individual "name-index" ones so things that can only
 * handle one compose file eg IDEs, editors or just running `docker compose` directly have something to work with
 *
 * This is `docker compose config` so it is the canonical merge of all our files and not something we have to
 * implement and maintain ourselves
 *
 * NOTE: this file is intentionally *not* part of `app.compose` or we would apply everything twice
 * NOTE: the project name is not optional, it is what named volumes and networks get prefixed with
 */
module.exports = async (engine, compose = [], project, dir, log) => {
  // we cannot do anything without an engine or compose files
  if (!engine || compose.length === 0) return undefined;

  const file = path.join(dir, combinedFile);

  await engine.compose('config', {compose, project, opts: {cmd: ['-o', file]}});
  log?.debug('dumped combined compose file to %s', file);
  return file;
};

module.exports.combinedFile = combinedFile;
