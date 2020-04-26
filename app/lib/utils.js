const fs = require("fs");
const leftpad = require("left-pad"); // I don't believe I'm depending on this
const pull = require("pull-stream");
const split = require("split-buffer");
const metrics = require("./metrics");
const isMobile = require("ismobilejs").default;

const isPhone = (req) => isMobile(req.headers["user-agent"]).phone;
module.exports.isPhone = isPhone;

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
    if (
      (opts.mobileVersion && isPhone(req)) ||
      (opts.desktopVersion && !isPhone(req))
    ) {
      let url = opts.mobileVersion || opts.desktopVersion;
      for (let key in req.params) {
        url = url.replace(`:${key}`, req.params[key]);
      }
      return res.redirect(url);
    }

    req.context.path = path;
    try {
      debug(`${method} ${path}`);
      metrics.router.inc({ method, path });
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
  return `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}`;
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

module.exports.identityFilename = (index) => {
  return "secret_" + leftpad(index, 2, "0") + ".butt";
};

module.exports.nextIdentityFilename = async (ssbClient) => {
  const identities = await ssbClient.identities.list();
  return module.exports.identityFilename(identities.length - 1);
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

module.exports.uploadPicture = async (ssbClient, picture) => {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (picture.size > maxSize) throw "Max size exceeded";

  return await new Promise((resolve, reject) =>
    pull(
      pull.values(split(picture.data, 64 * 1024)),
      ssbClient.blobs.add((err, result) => {
        if (err) return reject(err);
        return resolve(result);
      })
    )
  );
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
