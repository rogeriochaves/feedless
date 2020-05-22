var FlumeQuery = require("flumeview-query");

exports.name = "feedlessIndex";
exports.version = 1;
exports.manifest = {
  read: "source",
  explain: "sync",
  help: "sync",
};

var INDEX_VERSION = 1;
var indexes = [
  { key: "pts", value: [["value", "private"], ["timestamp"]] },
  { key: "wts", value: [["value", "content", "wall"], ["timestamp"]] },
];

function mapRts(msg) {
  msg.rts = Math.min(msg.timestamp, msg.value.timestamp) || msg.timestamp;
  return msg;
}

exports.init = function (ssb, config) {
  var s = ssb._flumeUse(
    "feedless-index",
    FlumeQuery(INDEX_VERSION, { indexes: indexes, map: mapRts })
  );
  var read = s.read;
  var explain = s.explain;
  s.explain = function (opts) {
    return explain(opts || {});
  };

  s.read = function (opts) {
    return read(opts || {});
  };

  return s;
};
