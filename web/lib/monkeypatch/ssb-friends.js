// Monkeypatched to add getGraph

"use strict";
var LayeredGraph = require("layered-graph");
var pull = require("pull-stream");
var isFeed = require("ssb-ref").isFeed;
// friends plugin
// methods to analyze the social graph
// maintains a 'follow' and 'flag' graph

exports.name = "friends";
exports.version = "1.0.0";
exports.manifest = {
  hopStream: "source",
  onEdge: "sync",
  isFollowing: "async",
  isBlocking: "async",
  getGraph: "async",
  hops: "async",
  help: "sync",
  // createLayer: 'sync',       // not exposed over RPC as returns a function
  get: "async", // legacy
  createFriendStream: "source", // legacy
  stream: "source", // legacy
};

//mdm.manifest(apidoc)

exports.init = function (sbot, config) {
  var max =
    (config.friends && config.friends.hops) ||
    (config.replicate && config.replicate.hops) ||
    3;
  var layered = LayeredGraph({ max: max, start: sbot.id });

  function getGraph(cb) {
    layered.onReady(function () {
      var g = layered.getGraph();
      cb(null, g);
    });
  }

  function isFollowing(opts, cb) {
    layered.onReady(function () {
      var g = layered.getGraph();
      cb(null, g[opts.source] ? g[opts.source][opts.dest] >= 0 : false);
    });
  }

  function isBlocking(opts, cb) {
    layered.onReady(function () {
      var g = layered.getGraph();
      cb(null, Math.round(g[opts.source] && g[opts.source][opts.dest]) == -1);
    });
  }

  //opinion: do not authorize peers blocked by this node.
  sbot.auth.hook(function (fn, args) {
    var self = this;
    isBlocking({ source: sbot.id, dest: args[0] }, function (err, blocked) {
      if (blocked) args[1](new Error("client is blocked"));
      else fn.apply(self, args);
    });
  });

  if (!sbot.replicate)
    throw new Error("ssb-friends expects a replicate plugin to be available");

  // opinion: replicate with everyone within max hops (max passed to layered above ^)
  pull(
    layered.hopStream({ live: true, old: true }),
    pull.drain(function (data) {
      if (data.sync) return;
      for (var k in data) {
        sbot.replicate.request(k, data[k] >= 0);
      }
    })
  );

  require("ssb-friends/contacts")(sbot, layered.createLayer, config);

  var legacy = require("ssb-friends/legacy")(layered);

  //opinion: pass the blocks to replicate.block
  setImmediate(function () {
    var block =
      (sbot.replicate && sbot.replicate.block) || (sbot.ebt && sbot.ebt.block);
    if (block) {
      function handleBlockUnlock(from, to, value) {
        if (value === false) block(from, to, true);
        else block(from, to, false);
      }
      pull(
        legacy.stream({ live: true }),
        pull.drain(function (contacts) {
          if (!contacts) return;

          if (isFeed(contacts.from) && isFeed(contacts.to)) {
            // live data
            handleBlockUnlock(contacts.from, contacts.to, contacts.value);
          } else {
            // initial data
            for (var from in contacts) {
              var relations = contacts[from];
              for (var to in relations)
                handleBlockUnlock(from, to, relations[to]);
            }
          }
        })
      );
    }
  });

  return {
    hopStream: layered.hopStream,
    onEdge: layered.onEdge,
    isFollowing: isFollowing,
    isBlocking: isBlocking,
    getGraph: getGraph,

    // expose createLayer, so that other plugins may express relationships
    createLayer: layered.createLayer,

    // legacy, debugging
    hops: function (opts, cb) {
      layered.onReady(function () {
        if (isFunction(opts)) (cb = opts), (opts = {});
        cb(null, layered.getHops(opts));
      });
    },
    help: function () {
      return require("ssb-friends/help");
    },
    // legacy
    get: legacy.get,
    createFriendStream: legacy.createFriendStream,
    stream: legacy.stream,
  };
};

// helpers

function isFunction(f) {
  return "function" === typeof f;
}
