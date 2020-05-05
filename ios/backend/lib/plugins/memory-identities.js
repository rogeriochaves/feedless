// Differently from ssb-identities, this plugin only keeps keys in memory, as we don't want to save them on the server

const ssbKeys = require("ssb-keys");
const { create } = require("ssb-validate");

exports.name = "identities";
exports.version = "1.0.0";
exports.manifest = {
  create: "sync",
  addUnboxer: "sync",
  publishAs: "async",
  createNewKey: "sync",
};

let unboxersAdded = [];
let locks = {};

const toTarget = (t) => (typeof t == "object" ? t && t.link : t);

const addUnboxer = (ssb) => (key) => {
  if (unboxersAdded.includes(key.id)) return;

  ssb.addUnboxer({
    key: (content) => {
      const unboxKey = ssbKeys.unboxKey(content, key);
      if (unboxKey) return unboxKey;
    },
    value: (content, key) => {
      return ssbKeys.unboxBody(content, key);
    },
  });
  unboxersAdded.push(key.id);
};

const publishAs = (ssb, config) => ({ key, private, content }, cb) => {
  const id = key.id;
  if (locks[id]) throw new Error("already writing");

  const recps = [].concat(content.recps).map(toTarget);

  if (content.recps && !private) {
    return new Error("recps set, but private not set");
  } else if (!content.recps && private) {
    return new Error("private set, but content.recps not set");
  } else if (!!content.recps && private) {
    if (!Array.isArray(content.recps) || !~recps.indexOf(id))
      return new Error(
        "content.recps must be an array containing publisher id:" +
          id +
          " was:" +
          JSON.stringify(recps) +
          " indexOf:" +
          recps.indexOf(id)
      );
    content = ssbKeys.box(content, recps);
  }

  locks[id] = true;
  ssb.getLatest(id, (_err, data) => {
    const state = data
      ? {
          id: data.key,
          sequence: data.value.sequence,
          timestamp: data.value.timestamp,
          queue: [],
        }
      : { id: null, sequence: null, timestamp: null, queue: [] };

    ssb.add(
      create(state, key, config.caps && config.caps.sign, content, Date.now()),
      (err, a, b) => {
        delete locks[id];
        cb(err, a, b);
      }
    );
  });
};

exports.init = function (ssb, config) {
  return {
    addUnboxer: addUnboxer(ssb),
    publishAs: publishAs(ssb, config),
    createNewKey: ssbKeys.generate,
  };
};
