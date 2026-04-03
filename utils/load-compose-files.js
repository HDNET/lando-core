'use strict';

const _ = require('lodash');
const Yaml = require('./../lib/yaml');
const path = require('path');
const yaml = new Yaml();
const fs = require('fs');
const remove = require('./remove');

const inspectImage = async (docker, image) => {
  const imageInfo = await docker.getImage(image).inspect();
  const config = _.get(imageInfo, 'Config', {});
  const containerConfig = _.get(imageInfo, 'ContainerConfig', {});
  return {
    entrypoint: config.Entrypoint ?? containerConfig.Entrypoint ?? null,
    command: config.Cmd ?? containerConfig.Cmd ?? null,
  };
};

const resolveServiceCommands = async (composeData, docker, log, engine, composeFilePaths, project) => {
  if (!docker) return composeData;

  for (const data of composeData) {
    const services = _.get(data, 'services', {});
    for (const [, service] of Object.entries(services)) {
      if (service.entrypoint && service.command) continue;

      try {
        const info = await inspectImage(docker, service.image);
        if (!service.entrypoint) service.entrypoint = info.entrypoint;
        if (!service.command) service.command = info.command;
      } catch {
        const serviceNames = _.keys(_.get(data, 'services', {}));
        const pullable = serviceNames.filter(name => !_.has(data, `services.${name}.build`));
        const local = serviceNames.filter(name => _.has(data, `services.${name}.build`));

        try {
          await engine.build({compose: composeFilePaths, project, opts: {pullable, local}});
          const info = await inspectImage(docker, service.image);
          if (!service.entrypoint) service.entrypoint = info.entrypoint;
          if (!service.command) service.command = info.command;
        } catch {
          log.error('Failed to build/pull composer docker images, continuing without entrypoint override...');
        }
      }
    }
  }

  return composeData;
};

// This just runs `docker compose --project-directory ${dir} config -f ${files} --output ${outputPaths}` to
// make all paths relative to the lando config root
module.exports = async (files, dir, landoComposeConfigDir, engine, project, envFiles, log) => {
  const composeFilePaths = _(require('./normalize-files')(files, dir)).value();
  if (_.isEmpty(composeFilePaths)) {
    return [];
  }

  if (!engine) {
    return _(composeFilePaths)
      .map(file => yaml.load(file))
      .value();
  }

  const outputFile = path.join(landoComposeConfigDir, 'resolved-compose-config.yml');
  fs.mkdirSync(path.dirname(outputFile), {recursive: true});
  await engine.getComposeConfig({compose: composeFilePaths, project, outputFilePath: outputFile, opts: {envFiles}});
  const result = yaml.load(outputFile);
  fs.unlinkSync(outputFile);
  remove(path.dirname(outputFile));

  return resolveServiceCommands([result], engine.docker, log, engine, composeFilePaths, project);
};
