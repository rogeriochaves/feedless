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
  let wrapper = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  return {
    get: (path, fn) => {
      app.get(path, wrapper(fn));
    },
    post: (path, fn) => {
      app.post(path, wrapper(fn));
    },
  };
};
