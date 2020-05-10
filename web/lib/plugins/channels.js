// Indexes community members

const FlumeReduce = require("flumeview-reduce");

exports.name = "channels";
exports.version = "1.0.0";
exports.manifest = {
  get: "async",
  stream: "source",
  members: "async",
};

exports.init = function (ssb) {
  const index = ssb._flumeUse("feedless-channels", FlumeReduce(3, reduce, map));
  return {
    get: index.get,
    stream: index.stream,
    members: (channel, cb) => {
      index.get((err, channels) => {
        if (err) return cb(err);

        const members = Object.keys(channels[channel].members);
        cb(null, members);
      });
    },
  };
};

function reduce(result, item) {
  if (!result) result = {};
  if (!item) return result;
  if (item.type == "channel") {
    const { channel, author, timestamp, subscribed } = item;

    if (!result[channel]) result[channel] = { members: {} };

    if (!subscribed) {
      const currentMember = result[channel].members[author];
      if (currentMember && timestamp > currentMember.timestamp) {
        delete result[channel].members[author];
      }
    } else {
      result[channel].members[author] = { timestamp };
    }
  }
  return result;
}

function map(msg) {
  if (msg.value.content) {
    const { type, channel } = msg.value.content;
    if (type == "channel") {
      // || (type == "post" && channel)) {
      return {
        type,
        channel,
        author: msg.value.author,
        timestamp: msg.timestamp,
        subscribed: msg.value.content.subscribed,
      };
    }
  }
}
