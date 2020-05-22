const pull = require("pull-stream");
const FlumeReduce = require("flumeview-reduce");
const debug = require("debug")("plugins:encrypted-view");
const ssbkeys = require("ssb-keys");

exports.name = "encryptedView";
exports.version = 1;
exports.manifest = {
  memoryDecryptedEntries: "async",
};

const MAX_ENTRIES_TO_HOLD = 20000;

exports.init = function (ssb) {
  let values;

  const view = ssb._flumeUse(
    "encrypted-messages",
    FlumeReduce(
      1,
      function reduce(result, item) {
        if (!result) result = [];
        if (item) {
          result.unshift(item);
        }
        return result.splice(0, MAX_ENTRIES_TO_HOLD);
      },
      function map(msg) {
        if (msg.value && typeof msg.value.content == "string") {
          return msg;
        }
      }
    )
  );

  view.get((err, result) => {
    if (!err && result) {
      values = result;
    }
  });

  let decryptedEntries = {};
  const memoryDecrypt = (profile) => {
    debug("Decrypting messages on the fly for", profile.id);

    let entries = {};
    decryptedEntries[profile.id] = entries;

    pull(
      pull.values(values),
      pull.drain((data) => {
        if (!data.value || typeof data.value.content != "string") return;

        const content = ssbkeys.unbox(data.value.content, profile.key);
        if (content) {
          debug("Found an entry!");
          data.value.content = content;

          if (!entries[content.type]) entries[content.type] = [];
          entries[content.type].push(data);
        }
      })
    );
  };

  return {
    memoryDecryptedEntries: (profile, cb) => {
      if (!values) {
        // Index is not ready yet
        cb(null, {});
        return;
      }

      const entries = decryptedEntries[profile.id];
      if (entries) {
        cb(null, entries);
      } else {
        // While messages start getting decrypted on background, we wait 1s to get the first ones
        // and return a quick answer already, but next fetch should get full messages
        memoryDecrypt(profile);
        setTimeout(() => {
          cb(null, decryptedEntries[profile.id]);
        }, 1000);
      }
    },
  };
};
