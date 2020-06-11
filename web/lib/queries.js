const pull = require("pull-stream");
const once = require("pull-stream/sources/once");
const cat = require("pull-cat");
const debugPosts = require("debug")("queries:posts"),
  debugMessages = require("debug")("queries:messages"),
  debugFriends = require("debug")("queries:friends"),
  debugFriendshipStatus = require("debug")("queries:friendship_status"),
  debugSearch = require("debug")("queries:search"),
  debugProfile = require("debug")("queries:profile"),
  debugCommunities = require("debug")("queries:communities"),
  debugCommunityMembers = require("debug")("queries:communityMembers"),
  debugCommunityPosts = require("debug")("queries:communityPosts"),
  debugCommunityIsMember = require("debug")("queries:communityIsMember"),
  debugCommunityProfileCommunities = require("debug")(
    "queries:communityProfileCommunities"
  );
const paramap = require("pull-paramap");
const { promisePull, mapValues } = require("./utils");
const ssb = require("./ssb-client");

const lastAboutValues = (dest) => {
  return promisePull(
    ssb.client().query.read({
      reverse: false,
      query: [
        {
          $filter: {
            value: {
              author: dest,
              content: {
                type: "about",
                about: dest,
              },
            },
          },
        },
      ],
    })
  ).then((msgs) => {
    let abouts = {};
    for (let msg of msgs) {
      if (!msg.value.content) continue;
      Object.assign(abouts, msg.value.content);
    }

    for (let key in abouts) {
      if (abouts[key] && abouts[key].remove) delete abouts[key];
    }

    return abouts;
  });
};

const mapProfiles = (data, callback) =>
  getProfile(data.value.author)
    .then((author) => {
      data.value.authorProfile = author;
      callback(null, data);
    })
    .catch((err) => callback(err, null));

const removeWallMention = (data, callback) => {
  const { wall, text } = data.value.content;
  if (wall && text) {
    data.value.content.text = text.replace(/^\[.*?\]\(.*?\) /, "");
  }
  callback(null, data);
};

let userDeletesCache = {};
const getUserDeletes = async (userId) => {
  if (userDeletesCache[userId]) return userDeletesCache[userId];

  const [deletes, connections] = await Promise.all([
    promisePull(
      ssb.client().query.read({
        reverse: false,
        query: [
          {
            $filter: {
              value: {
                author: userId,
                content: {
                  type: "delete",
                },
              },
            },
          },
        ],
      })
    ),
    ssb.client().friends.getConnections(userId),
  ]);

  const dests = deletes.map((x) => x.value.content.dest);

  let blocked = [];
  for (let key in connections) {
    if (connections[key] == "blocked") blocked.push(key);
  }

  userDeletesCache[userId] = {};
  userDeletesCache[userId].hiddenContent = dests;
  userDeletesCache[userId].blockedUsers = blocked;

  return userDeletesCache[userId];
};

const mapDeletes = (currentUserId) => async (data, callback) => {
  const authorDelete = await promisePull(
    ssb.client().query.read({
      reverse: false,
      query: [
        {
          $filter: {
            value: {
              author: data.value.author,
              content: {
                type: "delete",
                dest: data.key,
              },
            },
          },
        },
      ],
      limit: 1,
    })
  );
  const { hiddenContent, blockedUsers } = await getUserDeletes(currentUserId);

  data.value.deleted = authorDelete.length > 0;
  data.value.hidden =
    hiddenContent.includes(data.key) ||
    blockedUsers.includes(data.value.author);
  callback(null, data);
};

const getPosts = async (currentUserId, profile) => {
  debugPosts("Fetching");

  const posts = await promisePull(
    // @ts-ignore
    cat([
      // Posts from others in your wall
      ssb.client().feedlessIndex.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                content: {
                  wall: profile.id,
                },
              },
            },
          },
        ],
        limit: 30,
      }),
      // Deprecated way to see posts from others on your wall
      ssb.client().query.read({
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
        limit: 30,
      }),
      // Posts on your own wall
      ssb.client().query.read({
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
                  channel: { $not: true },
                  wall: { $not: true },
                },
              },
            },
          },
        ],
        limit: 30,
      }),
    ]),
    pull.filter((msg) => msg.value.content.type == "post"),
    paramap(mapReplies(currentUserId)),
    paramap(mapDeletes(currentUserId)),
    paramap(mapProfiles),
    paramap(removeWallMention)
  );

  debugPosts("Done");

  return flattenPostsWithReplies(posts);
};

const getPost = async (currentUserId, key) => {
  debugPosts("Fetching single");

  let post;
  try {
    post = await ssb.client().get({ id: key, meta: true });
    post.rts = post.value.timestamp;
  } catch (err) {
    if (err.name == "NotFoundError") {
      return [];
    } else {
      throw err;
    }
  }

  let root;
  if (post.value.content.root) {
    try {
      root = await ssb
        .client()
        .get({ id: post.value.content.root, meta: true });
      root.rts = root.value.timestamp;
    } catch (e) {}
  }

  const posts = await promisePull(
    // @ts-ignore
    cat([once(root || post)]),
    pull.filter((msg) => msg.value.content.type == "post"),
    paramap(mapReplies(currentUserId)),
    paramap(mapDeletes(currentUserId)),
    paramap(mapProfiles),
    paramap(removeWallMention)
  );

  debugPosts("Done");

  return flattenPostsWithReplies(posts);
};

const flattenPostsWithReplies = (posts) => {
  let flattenPosts = [];
  let postsByKey = {};
  for (const post of posts) {
    postsByKey[post.key] = post;
    for (const reply of post.value.content.replies) {
      postsByKey[reply.key] = reply;
    }
  }

  for (const post of posts) {
    flattenPosts.push(post);
    for (const reply of post.value.content.replies) {
      flattenPosts.push(reply);
      let branch = reply.value.content.branch;
      if (!branch) continue;
      let branchKey = typeof branch == "string" ? branch : branch[0];
      let previous = postsByKey[branchKey];
      if (!previous) continue;
      reply.value.content.inReplyTo = previous.value.authorProfile;
    }
    delete post.value.content.replies;
  }
  return flattenPosts;
};

const mapReplies = (currentUserId) => async (data, callback) => {
  try {
    const replies = await promisePull(
      ssb.client().query.read({
        reverse: true,
        query: [
          {
            $filter: {
              value: {
                content: {
                  root: data.key,
                },
              },
            },
          },
        ],
        limit: 10,
      }),
      paramap(mapProfiles),
      paramap(mapDeletes(currentUserId))
    );

    data.value.content.replies = replies;
    callback(null, data);
  } catch (err) {
    callback(err, null);
  }
};

const getSecretMessages = async (profile) => {
  debugMessages("Fetching");

  const messagesPromise = promisePull(
    // @ts-ignore
    cat([
      ssb.client().feedlessIndex.read({
        reverse: true,
        limit: 100,
        query: [
          {
            $filter: {
              value: {
                private: true,
                content: {
                  type: "post",
                },
              },
            },
          },
        ],
      }),
    ]),
    pull.filter(
      (msg) =>
        msg.value.content.type == "post" &&
        msg.value.content.recps &&
        msg.value.content.recps.includes(profile.id)
    )
  );

  const deletedPromise = promisePull(
    ssb.client().query.read({
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
    })
  ).then(Object.values);

  const memoryEntriesPromise = ssb
    .client()
    .encryptedView.memoryDecryptedEntries(profile);

  const [messages, deleted, memoryEntries] = await Promise.all([
    messagesPromise,
    deletedPromise,
    memoryEntriesPromise,
  ]);

  debugMessages(
    "Decrypted",
    (memoryEntries.post || []).length,
    " posts on the fly"
  );

  const deletedIds = deleted
    .concat(memoryEntries.delete || [])
    .map((x) => x.value.content.dest);

  const messagesByAuthor = {};
  for (const message of messages.concat(memoryEntries.post || [])) {
    if (message.value.author == profile.id) {
      for (const recp of message.value.content.recps) {
        if (recp == profile.id) continue;
        if (!messagesByAuthor[recp]) {
          messagesByAuthor[recp] = {
            author: recp,
            messages: [],
          };
        }
      }
      continue;
    }

    const author = message.value.author;
    if (!messagesByAuthor[author]) {
      messagesByAuthor[author] = {
        author: message.value.author,
        messages: [],
      };
    }
    if (!deletedIds.includes(message.key))
      messagesByAuthor[author].messages.push(message);
  }

  const profilesList = await Promise.all(
    Object.keys(messagesByAuthor).map((id) => getProfile(id))
  );
  const profilesHash = profilesList.reduce((hash, profile) => {
    hash[profile.id] = profile;
    return hash;
  }, {});

  const chatList = Object.values(messagesByAuthor).map((m) => {
    m.authorProfile = profilesHash[m.author];
    return m;
  });

  debugMessages("Done");
  return chatList;
};

const search = async (search) => {
  debugSearch("Fetching");

  // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
  const normalizedSearch = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const safelyEscapedSearch = normalizedSearch.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const loosenSpacesSearch = safelyEscapedSearch.replace(" ", ".*");
  const searchRegex = new RegExp(`.*${loosenSpacesSearch}.*`, "i");

  const peoplePromise = promisePull(
    ssb.client().query.read({
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
      if (!msg.value.content) return;

      const normalizedName = msg.value.content.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return searchRegex.exec(normalizedName);
    }),
    paramap(mapProfiles)
  );

  const communitiesPostsPromise = promisePull(
    ssb.client().query.read({
      reverse: true,
      query: [
        {
          $filter: {
            value: {
              private: { $not: true },
              content: {
                type: "post",
                channel: { $truthy: true },
              },
            },
          },
        },
      ],
      limit: 3000,
    })
  );

  const [people, communitiesPosts] = await Promise.all([
    peoplePromise,
    communitiesPostsPromise,
  ]);

  const communities = Array.from(
    new Set(communitiesPosts.map((p) => p.value.content.channel))
  ).filter((name) => {
    const normalizedName = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return searchRegex.exec(normalizedName);
  });

  debugSearch("Done");
  return { people: Object.values(mapValues(people)), communities };
};

const getFriends = async (profile) => {
  debugFriends("Fetching");

  let connections = await ssb.client().friends.getConnections(profile.id);

  const profilesList = await Promise.all(
    Object.keys(connections).map((id) => getProfile(id))
  );
  const profilesHash = profilesList.reduce((hash, profile) => {
    hash[profile.id] = profile;
    return hash;
  }, {});

  let result = {
    friends: [],
    requestsSent: [],
    requestsReceived: [],
    blocked: [],
  };
  for (let key in connections) {
    result[connections[key]].push(profilesHash[key]);
  }

  debugFriends("Done");
  return result;
};

const getFriendshipStatus = async (source, dest) => {
  debugFriendshipStatus("Fetching");

  let requestRejectionsPromise = promisePull(
    ssb.client().query.read({
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
    })
  ).then(mapValues);

  const [
    isFollowing,
    isFollowingBack,
    isBlocked,
    requestRejections,
  ] = await Promise.all([
    ssb.client().friends.isFollowing({ source: source, dest: dest }),
    ssb.client().friends.isFollowing({ source: dest, dest: source }),
    ssb.client().friends.isBlocking({ source: source, dest: dest }),
    requestRejectionsPromise.then((x) => x.map((y) => y.content.contact)),
  ]);

  let status = "no_relation";
  if (isBlocked) {
    status = "blocked";
  } else if (isFollowing && isFollowingBack) {
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

const getAllEntries = (query) => {
  let queries = [];
  if (query.author) {
    queries.push({ $filter: { value: { author: query.author } } });
  }
  if (query.type) {
    queries.push({ $filter: { value: { content: { type: query.type } } } });
  }
  const queryOpts = queries.length > 0 ? { query: queries } : {};

  return promisePull(
    ssb.client().query.read({
      reverse: true,
      limit: 1000,
      ...queryOpts,
    })
  );
};

let profileCache = {};
const getProfile = async (id) => {
  if (profileCache[id]) return profileCache[id];

  let abouts = await lastAboutValues(id);

  let profile = { id, name: abouts.name, image: abouts.image };
  profileCache[id] = profile;

  return profile;
};

const progress = (callback) => {
  pull(
    ssb.client().replicate.changes(),
    pull.drain(callback, (err) => {
      console.error("Progress drain error", err);
    })
  );
};

const autofollow = async (id) => {
  const isFollowing = await ssb.client().friends.isFollowing({
    source: ssb.client().id,
    dest: id,
  });

  if (!isFollowing) {
    await ssb.client().publish({
      type: "contact",
      contact: id,
      following: true,
      autofollow: true,
    });
  }
};

const getCommunities = async () => {
  debugCommunities("Fetching");

  const communitiesPosts = await promisePull(
    ssb.client().query.read({
      reverse: true,
      query: [
        {
          $filter: {
            value: {
              private: { $not: true },
              content: {
                type: "post",
                channel: { $truthy: true },
              },
            },
          },
        },
      ],
      limit: 100,
    })
  );

  const communities = Array.from(
    new Set(communitiesPosts.map((p) => p.value.content.channel))
  );

  debugCommunities("Done");

  return communities;
};

const isMember = async (id, channel) => {
  debugCommunityIsMember("Fetching");
  const [lastSubscription] = await promisePull(
    ssb.client().query.read({
      reverse: true,
      limit: 1,
      query: [
        {
          $filter: {
            value: {
              author: id,
              content: {
                type: "channel",
                channel: channel,
              },
            },
          },
        },
      ],
    })
  );
  debugCommunityIsMember("Done");

  return lastSubscription && lastSubscription.value.content.subscribed;
};

const getCommunityMembers = async (name) => {
  debugCommunityMembers("Fetching");
  const communityMembers = await promisePull(
    ssb.client().query.read({
      reverse: true,
      query: [
        {
          $filter: {
            value: {
              content: {
                type: "channel",
                channel: name,
              },
            },
          },
        },
        forceChannelIndex,
      ],
      limit: 50,
    }),
    paramap(mapProfiles)
  );
  const dedupMembers = {};
  for (const member of communityMembers) {
    const author = member.value.author;
    if (dedupMembers[author]) continue;
    dedupMembers[author] = member;
  }
  const onlySubscribedMembers = Object.values(dedupMembers).filter(
    (x) => x.value.content.subscribed
  );
  const memberProfiles = onlySubscribedMembers.map(
    (x) => x.value.authorProfile
  );

  debugCommunityMembers("Done");

  return memberProfiles;
};

const getProfileCommunities = async (id) => {
  debugCommunityProfileCommunities("Fetching");
  const subscriptions = await promisePull(
    ssb.client().query.read({
      reverse: true,
      query: [
        {
          $filter: {
            value: {
              author: id,
              content: {
                type: "channel",
              },
            },
          },
        },
      ],
    })
  );
  const dedupSubscriptions = {};
  for (const subscription of subscriptions) {
    const channel = subscription.value.content.channel;
    if (dedupSubscriptions[channel]) continue;
    dedupSubscriptions[channel] = subscription;
  }
  const onlyActiveSubscriptions = Object.values(dedupSubscriptions).filter(
    (x) => x.value.content.subscribed
  );
  const channelNames = onlyActiveSubscriptions.map(
    (x) => x.value.content.channel
  );
  debugCommunityProfileCommunities("Done");

  return channelNames;
};

const getPostWithReplies = async (channel, key) => {
  const posts = await getCommunityPosts(channel);
  const topic = posts.find((x) => x.key == key);

  return [topic, ...topic.value.content.replies];
};

const forceChannelIndex = {
  $sort: [["value", "content", "channel"], ["timestamp"]],
};

const getCommunityPosts = async (name) => {
  debugCommunityPosts("Fetching");

  const communityPosts = await promisePull(
    ssb.client().query.read({
      reverse: true,
      query: [
        {
          $filter: {
            value: {
              content: {
                type: "post",
                channel: name,
              },
            },
          },
        },
        forceChannelIndex,
      ],
      limit: 1000,
    }),
    paramap(mapProfiles)
  );
  let communityPostsByKey = {};
  let repliesByKey = {};

  let getRootKey = (post) => {
    return (
      post.value.content.root ||
      (post.value.content.reply && Object.keys(post.value.content.reply)[0])
    );
  };

  for (let post of communityPosts) {
    if (getRootKey(post)) {
      repliesByKey[post.key] = post;
    } else {
      post.value.content.replies = [];
      communityPostsByKey[post.key] = post;
    }
  }
  for (let reply of Object.values(repliesByKey)) {
    const rootKey = getRootKey(reply);
    const root = communityPostsByKey[rootKey];
    if (root) {
      root.value.content.replies.push(reply);
    }

    let nestedReply = repliesByKey[rootKey];
    while (nestedReply) {
      const nestedRootKey = getRootKey(nestedReply);
      const nestedRoot = communityPostsByKey[nestedRootKey];
      if (nestedRoot) {
        nestedRoot.value.content.replies.push(reply);
        nestedReply = null;
      } else {
        nestedReply = repliesByKey[nestedRootKey];
      }
    }
  }

  debugCommunityPosts("Done");

  let posts = Object.values(communityPostsByKey);
  posts = posts.sort((a, b) => b.rts - a.rts);

  return posts;
};

if (!global.clearProfileInterval) {
  let oneHour = 60 * 60 * 1000;
  let fiveMinutes = 5 * 60 * 1000;
  let cacheDuration =
    process.env.NODE_ENV == "production" ? oneHour : fiveMinutes;
  global.clearProfileInterval = setInterval(() => {
    debugProfile("Clearing profile cache");
    profileCache = {};
  }, cacheDuration);
}

module.exports = {
  mapProfiles,
  getPost,
  getPosts,
  search,
  getFriends,
  getAllEntries,
  getProfile,
  getSecretMessages,
  profileCache,
  getFriendshipStatus,
  getCommunities,
  getCommunityMembers,
  getCommunityPosts,
  getPostWithReplies,
  progress,
  autofollow,
  isMember,
  getProfileCommunities,
  userDeletesCache,
};
