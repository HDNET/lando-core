'use strict';

const _ = require('lodash');

/*
 * Helper to work out whether the command being run is one that passes its args through
 *
 * Returns the command id if it does and undefined if it does not, which is exactly what cli.passthrough wants.
 */
module.exports = (tasks = [], command = undefined) => {
  if (typeof command !== 'string' || command.length === 0) return undefined;

  const task = _.find(tasks, task => (task.id ?? _.get(task, 'command', '').split(' ')[0]) === command);
  return _.get(task, 'passthrough', false) ? command : undefined;
};
