// 1) Monkeypatched to include the refresh function
// 2) Monkeypatched to allow secret messages without published in the recps
var leftpad = require("left-pad");
var path = require("path");
var mkdirp = require("mkdirp");
var fs = require("fs");
var ssbKeys = require("ssb-keys");
var create = require("ssb-validate").create;

function toTarget(t) {
  return "object" === typeof t ? t && t.link : t;
}

exports.name = "identities";
exports.version = "1.0.0";
exports.manifest = {
  main: "sync",
  list: "async",
  create: "async",
  publishAs: "async",
  help: "sync",
};

exports.init = function (sbot, config) {
  var dir = path.join(config.path, "identities");
  mkdirp.sync(dir);

  function readKeys() {
    return fs
      .readdirSync(dir)
      .filter(function (name) {
        return /^secret_\d+\.butt$/.test(name);
      })
      .map(function (file) {
        return ssbKeys.loadSync(path.join(dir, file));
      });
  }

  var keys = readKeys();

  var locks = {};

  sbot.addUnboxer({
    key: function (content) {
      for (var i = 0; i < keys.length; i++) {
        var key = ssbKeys.unboxKey(content, keys[i]);
        if (key) return key;
      }
    },
    value: function (content, key) {
      return ssbKeys.unboxBody(content, key);
    },
  });

  return {
    main: function () {
      return sbot.id;
    },
    refresh: function () {
      keys = readKeys();
    },
    list: function (cb) {
      cb(
        null,
        [sbot.id].concat(
          keys.map(function (e) {
            return e.id;
          })
        )
      );
    },
    create: function (cb) {
      var filename = "secret_" + leftpad(keys.length, 2, "0") + ".butt";
      ssbKeys.create(path.join(dir, filename), function (err, newKeys) {
        keys.push(newKeys);
        cb(err, newKeys.id);
      });
    },
    publishAs: function (opts, cb) {
      var id = opts.id;
      if (locks[id]) return cb(new Error("already writing"));
      var _keys =
        sbot.id === id
          ? sbot.keys
          : keys.find(function (e) {
              return id === e.id;
            });
      if (!_keys) return cb(new Error("must provide id of listed identities"));
      var content = opts.content;

      var recps = [].concat(content.recps).map(toTarget);

      if (content.recps && !opts.private)
        return cb(new Error("recps set, but opts.private not set"));
      else if (!content.recps && opts.private)
        return cb(new Error("opts.private set, but content.recps not set"));
      else if (!!content.recps && opts.private) {
        if (!Array.isArray(content.recps) || !content.recps.length)
          return cb(
            new Error(
              "content.recps must be an array containing at least one id, was:" +
                JSON.stringify(recps)
            )
          );
        content = ssbKeys.box(content, recps);
      }

      locks[id] = true;
      sbot.getLatest(id, function (err, data) {
        var state = data
          ? {
              id: data.key,
              sequence: data.value.sequence,
              timestamp: data.value.timestamp,
              queue: [],
            }
          : { id: null, sequence: null, timestamp: null, queue: [] };
        sbot.add(
          create(
            state,
            _keys,
            config.caps && config.caps.sign,
            content,
            Date.now()
          ),
          function (err, a, b) {
            delete locks[id];
            cb(err, a, b);
          }
        );
      });
    },
    help: function () {
      return require("./help");
    },
  };
};
