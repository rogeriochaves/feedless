const fs = require("fs");

module.exports.asyncRouter = (app) => {
  const debug = require("debug")("router");

  let wrapper = (debugMsg, fn) => async (req, res, next) => {
    try {
      debug(debugMsg);
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  return {
    get: (path, fn) => {
      app.get(path, wrapper(`GET ${path}`, fn));
    },
    post: (path, fn) => {
      debug(`POST ${path}`);
      app.post(path, wrapper(`POST ${path}`, fn));
    },
  };
};

module.exports.writeKey = (key, path) => {
  let homeFolder =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  let ssbFolder = `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}`;
  let secretPath = `${ssbFolder}${path}`;

  // Same options ssb-keys use
  fs.mkdirSync(ssbFolder, { recursive: true });
  fs.writeFileSync(secretPath, key, { mode: 0x100, flag: "wx" });
};
