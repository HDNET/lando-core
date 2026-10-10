
'use strict';

const _ = require('lodash');
const url = require('url');

module.exports = data => {
  // We add the protocol ourselves, so it can be parsed. We also change all *
  // occurrences for our magic word __wildcard__, because otherwise the url parser
  // won't parse wildcards in the hostname correctly.
  // Object routes may carry a port or pathname inside the hostname (eg
  // `hostname: foo.lndo.site:9000/path`) so we parse the hostname either way and
  // then let any explicit keys on the object win over what we parsed out.
  const hostname = _.isString(data) ? data : data.hostname;
  const parsedUrl = url.parse(`http://${hostname}`.replace(/\*/g, '__wildcard__'));
  if (!_.isString(data)) {
    _.forEach(_.omit(data, ['hostname']), (value, key) => {
      if (!_.isNil(value)) parsedUrl[key] = value;
    });
  }

  // If the port is null then set it to 80
  if (_.isNil(parsedUrl.port)) parsedUrl.port = '80';

  // Retranslate and send
  const defaults = {port: '80', pathname: '/', middlewares: []};
  return _.merge(defaults, parsedUrl, {host: parsedUrl.hostname.replace(/__wildcard__/g, '*')});
};
