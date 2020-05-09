const ssb = require("./ssb-client");
const ssbKeys = require("ssb-keys");
const fs = require("fs");

module.exports = (app) => {
  const debug = require("debug")("router");

  let wrapper = (method, path, opts, fn) => async (req, res, next) => {
    debug(`${method} ${path}`);

    if (typeof opts == "function") fn = opts;

    const status = ssb.getStatus();
    if (status == "indexing" && !opts.skipStatusCheck) {
      res.status(503);
      return res.json({ error: "DB is indexing, wait for it to finish first" });
    }

    req.context = { status, path };
    res.locals.context = req.context;

    let key;
    try {
      const isLoggedOut = fs.existsSync(`${ssbFolder()}/logged-out`);
      key = !isLoggedOut && ssbKeys.loadSync(`${ssbFolder()}/secret`);
    } catch (_) {}
    req.context.key = key;

    if (!opts.public && !req.context.profile) {
      res.status(401);
      console.log("sending", { error: "You are not logged in" });
      return res.json({ error: "You are not logged in" });
    }

    try {
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
