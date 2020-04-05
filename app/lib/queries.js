const { promisify } = require("./utils");
const pull = require("pull-stream");

const mapAuthorName = (ssbServer) => (data, callback) => {
  let promises = [];

  const authorNamePromise = promisify(ssbServer.about.latestValue, {
    key: "name",
    dest: data.value.author,
  });
  promises.push(authorNamePromise);

  if (data.value.content.type == "contact") {
    const contactNamePromise = promisify(ssbServer.about.latestValue, {
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

const getPosts = (ssbServer) =>
  new Promise((resolve, reject) => {
    pull(
      ssbServer.query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                content: { type: "post" },
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

const getPeople = (ssbServer) =>
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
        limit: 500,
      }),
      pull.collect((err, msgs) => {
        let people = {};
        for (let person of msgs) {
          const author = person.value.author;
          if (author == person.value.content.about && !people[author]) {
            people[author] = person.value;
          }
        }

        if (err) return reject(err);
        return resolve(Object.values(people));
      })
    );
  });

const getFriends = (profile, ssbServer) =>
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
        limit: 100,
      }),
      pull.collect((err, msgs) => {
        const entries = msgs.map((x) => x.value);

        if (err) return reject(err);
        return resolve(entries);
      })
    );
  });

module.exports = {
  mapAuthorName,
  getPosts,
  getPeople,
  getFriends,
  getAllEntries,
};
