const pull = require("pull-stream");
const cat = require("pull-cat");
const debugPosts = require("debug")("queries:posts"),
  debugMessages = require("debug")("queries:messages"),
  debugFriends = require("debug")("queries:friends"),
  debugFriendshipStatus = require("debug")("queries:friendship_status"),
  debugPeople = require("debug")("queries:people"),
  debugProfile = require("debug")("queries:profile");
const paramap = require("pull-paramap");

const latestOwnerValue = (ssbServer, { key, dest }) =>
  new Promise((resolve, reject) => {
    let value = null;
    pull(
      ssbServer.query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                author: dest,
                content: { type: "about", about: dest },
              },
            },
          },
        ],
      }),
      pull.filter((msg) => {
        return (
          msg.value.content &&
          key in msg.value.content &&
          !(msg.value.content[key] && msg.value.content[key].remove)
        );
      }),
      pull.take(1),
      pull.drain(
        (msg) => {
          value = msg.value.content[key];
        },
        (err) => {
          if (err) return reject(err);
          if (!value) {
            ssbServer.about
              .latestValue({ key, dest })
              .then(resolve)
              .catch(reject);
          } else {
            resolve(value);
          }
        }
      )
    );
  });

const mapProfiles = (ssbServer) => (data, callback) =>
  getProfile(ssbServer, data.value.author)
    .then((author) => {
      data.value.authorProfile = author;
      callback(null, data);
    })
    .catch((err) => callback(err, null));

const getPosts = (ssbServer, profile) =>
  debugPosts("Fetching") ||
  new Promise((resolve, reject) => {
    pull(
      // @ts-ignore
      cat([
        ssbServer.query.read({
          reverse: true,
          query: [
            {
              $filter: {
                value: {
                  private: { $not: true },
                  content: {
                    root: profile.id,
                  },
                },
              },
            },
          ],
          limit: 100,
        }),
        ssbServer.query.read({
          reverse: true,
          query: [
            {
              $filter: {
                value: {
                  author: profile.id,
                  private: { $not: true },
                  content: {
                    type: "post",
                    root: { $not: true },
                  },
                },
              },
            },
          ],
          limit: 100,
        }),
      ]),
      pull.filter((msg) => msg.value.content.type == "post"),
      paramap(mapProfiles(ssbServer)),
      pull.collect((err, msgs) => {
        debugPosts("Done");
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

const getVanishingMessages = async (ssbServer, profile) => {
  debugMessages("Fetching");
  const messagesPromise = new Promise((resolve, reject) => {
    pull(
      // @ts-ignore
      cat([
        ssbServer.query.read({
          reverse: true,
          query: [
            {
              $filter: {
                value: {
                  private: true,
                  content: {
                    root: profile.id,
                  },
                },
              },
            },
          ],
          limit: 100,
        }),
        ssbServer.query.read({
          reverse: true,
          query: [
            {
              $filter: {
                value: {
                  private: true,
                  content: {
                    type: "post",
                    root: { $not: true },
                  },
                },
              },
            },
          ],
          limit: 100,
        }),
      ]),
      pull.filter(
        (msg) =>
          msg.value.content.type == "post" &&
          (msg.value.content.root ||
            msg.value.content.recps.includes(profile.id))
      ),
      paramap(mapProfiles(ssbServer)),
      pull.collect((err, msgs) => {
        if (err) return reject(err);
        return resolve(msgs);
      })
    );
  });

  const deletedPromise = new Promise((resolve, reject) => {
    pull(
      ssbServer.query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                author: profile.id,
                content: {
                  type: "delete",
                },
              },
            },
          },
        ],
      }),
      pull.collect((err, msgs) => {
        if (err) return reject(err);
        return resolve(Object.values(msgs));
      })
    );
  });

  const [messages, deleted] = await Promise.all([
    messagesPromise,
    deletedPromise,
  ]);
  const deletedIds = deleted.map((x) => x.value.content.dest);
  debugMessages("Done");
  return messages.filter((m) => !deletedIds.includes(m.key));
};

const searchPeople = (ssbServer, search) =>
  debugPeople("Fetching") ||
  new Promise((resolve, reject) => {
    pull(
      ssbServer.query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                content: {
                  type: "about",
                  name: { $is: "string" },
                },
              },
            },
          },
        ],
      }),
      pull.filter((msg) => {
        return (
          msg.value.content &&
          msg.value.author == msg.value.content.about &&
          msg.value.content.name.includes(search)
        );
      }),
      pull.collect((err, msgs) => {
        debugPeople("Done");
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(Object.values(entries));
      })
    );
  });

const getFriends = async (ssbServer, profile) => {
  debugFriends("Fetching");

  let contacts = await new Promise((resolve, reject) => {
    pull(
      // @ts-ignore
      cat([
        ssbServer.query.read({
          reverse: true,
          query: [
            {
              $filter: {
                value: {
                  author: profile.id,
                  content: {
                    type: "contact",
                  },
                },
              },
            },
          ],
          limit: 100,
        }),
        ssbServer.query.read({
          reverse: true,
          query: [
            {
              $filter: {
                value: {
                  content: {
                    type: "contact",
                    contact: profile.id,
                  },
                },
              },
            },
          ],
          limit: 100,
        }),
      ]),
      pull.collect((err, msgs) => {
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

  let network = {};
  let requestRejections = [];
  for (let contact of contacts.reverse()) {
    if (contact.content.following) {
      network[contact.author] = network[contact.author] || {};
      network[contact.author][contact.content.contact] = true;
    } else {
      // contact.content.blocking or contact.content.flagged or !contact.content.following
      if (contact.author == profile.id && contact.content.following === false) {
        requestRejections.push(contact.content.contact);
      }

      if (network[contact.author])
        delete network[contact.author][contact.content.contact];
    }
  }

  let friends = [];
  let requestsSent = [];
  let requestsReceived = [];

  const unique = (x) => Array.from(new Set(x));
  const allIds = unique(
    Object.keys(network).concat(Object.keys(network[profile.id]))
  );
  const profilesList = await Promise.all(
    allIds.map((id) => getProfile(ssbServer, id))
  );
  const profilesHash = profilesList.reduce((hash, profile) => {
    hash[profile.id] = profile;
    return hash;
  }, {});

  for (let key of allIds) {
    if (key == profile.id) continue;

    let isFollowing = network[profile.id][key];
    let isFollowingBack = network[key] && network[key][profile.id];
    if (isFollowing && isFollowingBack) {
      friends.push(profilesHash[key]);
    } else if (isFollowing && !isFollowingBack) {
      requestsSent.push(profilesHash[key]);
    } else if (!isFollowing && isFollowingBack) {
      if (!requestRejections.includes(key))
        requestsReceived.push(profilesHash[key]);
    }
  }

  debugFriends("Done");
  return { friends, requestsSent, requestsReceived };
};

const getFriendshipStatus = async (ssbServer, source, dest) => {
  debugFriendshipStatus("Fetching");

  let requestRejectionsPromise = new Promise((resolve, reject) => {
    pull(
      ssbServer.query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                author: source,
                content: {
                  type: "contact",
                  following: false,
                },
              },
            },
          },
        ],
        limit: 100,
      }),
      pull.collect((err, msgs) => {
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

  const [isFollowing, isFollowingBack, requestRejections] = await Promise.all([
    ssbServer.friends.isFollowing({ source: source, dest: dest }),
    ssbServer.friends.isFollowing({ source: dest, dest: source }),
    requestRejectionsPromise.then((x) => x.map((y) => y.content.contact)),
  ]);

  let status = "no_relation";
  if (isFollowing && isFollowingBack) {
    status = "friends";
  } else if (isFollowing && !isFollowingBack) {
    status = "request_sent";
  } else if (!isFollowing && isFollowingBack) {
    if (requestRejections.includes(dest)) {
      status = "request_rejected";
    } else {
      status = "request_received";
    }
  }
  debugFriendshipStatus("Done");

  return status;
};

const getAllEntries = (ssbServer, query) =>
  new Promise((resolve, reject) => {
    let queries = [];
    if (query.author) {
      queries.push({ $filter: { value: { author: query.author } } });
    }
    if (query.type) {
      queries.push({ $filter: { value: { content: { type: query.type } } } });
    }
    const queryOpts = queries.length > 0 ? { query: queries } : {};

    pull(
      ssbServer.query.read({
        reverse: true,
        limit: 500,
        ...queryOpts,
      }),
      pull.collect((err, msgs) => {
        if (err) return reject(err);
        return resolve(msgs);
      })
    );
  });

let profileCache = {};
const getProfile = async (ssbServer, id) => {
  if (profileCache[id]) return profileCache[id];

  let getKey = (key) => latestOwnerValue(ssbServer, { key, dest: id });

  let [name, image, description] = await Promise.all([
    getKey("name"),
    getKey("image"),
    getKey("description"),
  ]).catch((err) => {
    console.error("Could not retrieve profile for", id, err);
  });

  let profile = { id, name, image, description };
  profileCache[id] = profile;

  return profile;
};

setInterval(() => {
  debugProfile("Clearing profile cache");
  profileCache = {};
}, 5 * 60 * 1000);

module.exports = {
  mapProfiles,
  getPosts,
  searchPeople,
  getFriends,
  getAllEntries,
  getProfile,
  getVanishingMessages,
  profileCache,
  getFriendshipStatus,
};
