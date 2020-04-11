const fs = require("fs");
const leftpad = require("left-pad"); // I don't believe I'm depending on this

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

const ssbFolder = () => {
  let homeFolder =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}`;
};

module.exports.writeKey = (key, path) => {
  let secretPath = `${ssbFolder()}${path}`;

  // Same options ssb-keys use
  fs.mkdirSync(ssbFolder(), { recursive: true });
  fs.writeFileSync(secretPath, key, { mode: 0x100, flag: "wx" });
};

module.exports.nextIdentityFilename = async (ssbServer) => {
  const identities = await ssbServer.identities.list();
  return "secret_" + leftpad(identities.length - 1, 2, "0") + ".butt";
};

// From ssb-keys
module.exports.reconstructKeys = (keyfile) => {
  var privateKey = keyfile
    .replace(/\s*\#[^\n]*/g, "")
    .split("\n")
    .filter((x) => x)
    .join("");

  var keys = JSON.parse(privateKey);
  const hasSigil = (x) => /^(@|%|&)/.test(x);

  if (!hasSigil(keys.id)) keys.id = "@" + keys.public;
  return keys;
};

module.exports.readKey = (path) => {
  let secretPath = `${ssbFolder()}${path}`;

  let keyfile = fs.readFileSync(secretPath, "utf8");
  return module.exports.reconstructKeys(keyfile);
};
