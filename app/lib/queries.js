const { promisify } = require("./utils");
const pull = require("pull-stream");

const latestOwnerValue = (ssbServer) => ({ key, dest }, cb) => {
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
        if (err) return cb(err);
        if (!value) {
          ssbServer.about.latestValue({ key, dest }, cb);
        } else {
          cb(null, value);
        }
      }
    )
  );
};

const mapAuthorName = (ssbServer) => (data, callback) => {
  let promises = [];

  const authorNamePromise = promisify(latestOwnerValue(ssbServer), {
    key: "name",
    dest: data.value.author,
  });
  promises.push(authorNamePromise);

  if (data.value.content.type == "contact") {
    const contactNamePromise = promisify(latestOwnerValue(ssbServer), {
      key: "name",
      dest: data.value.content.contact,
    });
    promises.push(contactNamePromise);
  }

  return Promise.all(promises)
    .then(([authorName, contactName]) => {
      data.value.authorName = authorName;
      if (contactName) {
        data.value.content.contactName = contactName;
      }

      callback(null, data);
    })
    .catch((err) => callback(err, null));
};

const getPosts = (ssbServer, profile) =>
  new Promise((resolve, reject) => {
    pull(
      ssbServer.query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                content: { type: "post", wall: profile.id },
              },
            },
          },
        ],
        limit: 100,
      }),
      pull.asyncMap(mapAuthorName(ssbServer)),
      pull.collect((err, msgs) => {
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

const searchPeople = (ssbServer, search) =>
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
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(Object.values(entries));
      })
    );
  });

const getFriends = (ssbServer, profile) =>
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
        limit: 500,
      }),
      pull.asyncMap(mapAuthorName(ssbServer)),
      pull.collect((err, msgs) => {
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

const getAllEntries = (ssbServer) =>
  new Promise((resolve, reject) => {
    pull(
      ssbServer.query.read({
        reverse: true,
        limit: 500,
      }),
      pull.collect((err, msgs) => {
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

const getProfile = async (ssbServer, id) => {
  let [name, imageHash] = await Promise.all([
    promisify(latestOwnerValue(ssbServer), { key: "name", dest: id }),
    promisify(latestOwnerValue(ssbServer), { key: "image", dest: id }),
  ]);
  imageHash =
    imageHash && typeof imageHash == "object" ? imageHash.link : imageHash;

  const image = imageHash && `/blob/${encodeURIComponent(imageHash)}`;
  return { id, name, image };
};

module.exports = {
  mapAuthorName,
  getPosts,
  searchPeople,
  getFriends,
  getAllEntries,
  getProfile,
};
