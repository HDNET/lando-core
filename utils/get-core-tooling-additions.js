'use strict';

const _ = require('lodash');

/*
 * Helper to work out which of the tooling commands lando provides on the users behalf should actually be added
 *
 * Note that we compare ids eg "db-import" and not keys eg "db-import <file>". This means a user who declares a
 * plain "db-import" _replaces_ our "db-import <file>" instead of ending up with both of them. It also means we
 * never deep merge our defaults into a command the user has redefined.
 */
module.exports = (core = {}, tooling = {}) => {
  const claimed = _(tooling).keys().map(key => key.split(' ')[0]).value();
  return _.omitBy(core, (task, key) => _.includes(claimed, key.split(' ')[0]));
};
