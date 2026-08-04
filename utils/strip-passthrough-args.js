'use strict';

const _ = require('lodash');

// argv keys that are structural and must always survive
const structural = ['_', '--', '$0', '_app', '_yargs', '_eventArgs'];

/*
 * Helper to expand an option name into every key yargs might set for it
 */
const expand = (name, config = {}) => _([name])
  .concat(_.get(config, 'alias', []))
  .flatten()
  .filter(_.isString)
  .flatMap(key => [key, _.camelCase(key)])
  .uniq()
  .value();

/*
 * Helper to remove the args that belong to a passthrough command from our own argv
 *
 * Tooling commands hand everything after the command name to the thing they wrap, but yargs still parses those
 * args and we read a few things straight off the result eg "autoRemove" in utils/build-tooling-task.js. That
 * means an "--auto-remove" meant for the wrapped command would quietly change how we run the container.
 *
 * So we keep only what we actually declared for the command plus whatever global options showed up before it.
 * The upshot is that "lando console foo --deps" passes --deps to console while "lando --deps console foo"
 * still means it for us.
 */
module.exports = (argv = {}, {options = {}, positionals = {}, dynamic = undefined, globals = {}} = {}) => {
  // everything the command itself declared, including aliases and their camelCase forms
  const declared = _([])
    .concat(_.flatMap(options, (config, name) => expand(name, config)))
    .concat(_.flatMap(positionals, (config, name) => expand(name, config)))
    .concat(dynamic ? expand(dynamic) : [])
    .concat(structural)
    .uniq()
    .value();

  // our own options only ever come from the region before the command
  const ours = _.omit(globals, ['_', '$0', '--']);

  return {...ours, ..._.pick(argv, declared)};
};
