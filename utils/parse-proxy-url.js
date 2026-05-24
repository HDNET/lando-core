
'use strict';

const _ = require('lodash');

module.exports = data => {
  // We add the protocol ourselves, so it can be parsed. We also change all *
  // occurrences for our magic word __wildcard__, because otherwise the url parser
  // won't parse wildcards in the hostname correctly.
  let parsedUrl;
  if (_.isString(data)) {
    const u = new URL(`http://${data}`.replace(/\*/g, '__wildcard__'));
    parsedUrl = {hostname: u.hostname, port: u.port, pathname: u.pathname};
  } else {
    parsedUrl = _.merge({}, data, {hostname: data.hostname.replace(/\*/g, '__wildcard__')});
  }

  // If the port is empty then set it to 80
  if (!parsedUrl.port) parsedUrl.port = '80';

  // Retranslate and send
  const defaults = {port: '80', pathname: '/', middlewares: []};
  return _.merge(defaults, parsedUrl, {host: parsedUrl.hostname.replace(/__wildcard__/g, '*')});
};
