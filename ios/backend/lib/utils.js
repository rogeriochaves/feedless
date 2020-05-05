const fs = require("fs");
const pull = require("pull-stream");

module.exports.asyncRouter = (app) => {
  const debug = require("debug")("router");

  let wrapper = (method, path, opts, fn) => async (req, res, next) => {
    if (typeof opts == "function") fn = opts;
    if (!opts.public && !req.context.profile) {
      if (method == "POST") {
        res.status(401);
        return res.send("You are not logged in");
      }
      return res.redirect("/");
    }

    req.context.path = path;
    try {
      debug(`${method} ${path}`);
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  return {
    get: (path, fn, opts) => {
      app.get(path, wrapper("GET", path, fn, opts));
    },
    post: (path, fn, opts) => {
      debug(`POST ${path}`);
      app.post(path, wrapper("POST", path, fn, opts));
    },
  };
};

const ssbFolder = () => {
  let homeFolder =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return `${process.argv[2] || homeFolder + "/.ssb"}`;
};
module.exports.ssbFolder = ssbFolder;

module.exports.writeKey = (key, path) => {
  let secretPath = `${ssbFolder()}${path}`;

  // Same options ssb-keys use
  try {
    fs.mkdirSync(ssbFolder(), { recursive: true });
  } catch (e) {}
  fs.writeFileSync(secretPath, key, { mode: 0x100, flag: "wx" });
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

module.exports.promisePull = (...streams) =>
  new Promise((resolve, reject) => {
    pull(
      ...streams,
      pull.collect((err, msgs) => {
        if (err) return reject(err);
        return resolve(msgs);
      })
    );
  });

module.exports.mapValues = (x) => x.map((y) => y.value);
