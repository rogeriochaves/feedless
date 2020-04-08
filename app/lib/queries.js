const pull = require("pull-stream");
const cat = require("pull-cat");
const debug = require("debug")("queries");
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

const mapProfiles = (ssbServer) => (data, callback) => {
  const authorPromise = getProfile(ssbServer, data.value.author);
  const contactPromise =
    data.value.content.type == "contact" &&
    getProfile(ssbServer, data.value.content.contact);

  return Promise.all([authorPromise, contactPromise])
    .then(([author, contact]) => {
      data.value.authorProfile = author;
      if (contact) {
        data.value.content.contactProfile = contact;
      }
      callback(null, data);
    })
    .catch((err) => callback(err, null));
};

const getPosts = (ssbServer, profile) =>
  debug("Fetching posts") ||
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
        debug("Done fetching posts");
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

const getVanishingMessages = async (ssbServer, profile) => {
  debug("Fetching vanishing messages");
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

  debug("Done fetching vanishing messages");
  return messages.filter((m) => !deletedIds.includes(m.key));
};

const searchPeople = (ssbServer, search) =>
  debug("Searching people") ||
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
        debug("Done searching people");
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(Object.values(entries));
      })
    );
  });

const getFriends = (ssbServer, profile) =>
  debug("Fetching friends") ||
  new Promise((resolve, reject) => {
    pull(
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
        limit: 20,
      }),
      paramap(mapProfiles(ssbServer)),
      pull.collect((err, msgs) => {
        debug("Done fetching friends");
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

const getAllEntries = (ssbServer, query) =>
  debug("Fetching All Entries") ||
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
        debug("Done fetching all entries");

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
  debug("Clearing profile cache");
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
};
