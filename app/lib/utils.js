module.exports.promisify = (method, options = null) => {
  return new Promise((resolve, reject) => {
    const callback = (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    };
    if (options) {
      method(options, callback);
    } else {
      method(callback);
    }
  });
};

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
