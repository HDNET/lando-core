'use strict';

const _ = require('lodash');

/*
 * Helper to get a map of service name to image from compose data
 *
 * Note that services built from an imagefile eg api 4 services will not show up here and that later definitions
 * of the same service win, which matches how the compose data is merged downstream.
 */
module.exports = (composeData = []) => _(composeData)
  .flatMap(data => _.get(data, 'data', []))
  .flatMap(data => _.map(_.get(data, 'services', {}), (config, service) => ([service, _.get(config, 'image')])))
  .filter(pair => typeof pair[1] === 'string')
  .fromPairs()
  .value();
