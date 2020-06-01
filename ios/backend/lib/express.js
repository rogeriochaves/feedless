const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const asyncRouter = require("./asyncRouter");
const queries = require("./queries");
const ssb = require("./ssb-client");
const bodyParser = require("body-parser");
const serveBlobs = require("./serve-blobs");
const debug = require("debug")("express");
const fs = require("fs");
const { ssbFolder, uploadPicture } = require("./utils");
const ssbKeys = require("ssb-keys");
const fileUpload = require("express-fileupload");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

const router = asyncRouter(app);

router.get("/context", { public: true }, (req, res) => {
  const { current, target } = ssb.getIndexingState();

  res.json({
    status: req.context.status,
    indexingCurrent: current,
    indexingTarget: target,
  });
});

const ONE_WEEK = 60 * 60 * 24 * 7;

router.get("/posts", { public: true }, (_req, res) => {
  const posts = [
    {
      key: "%PvT5scAQqPNiVaoYUoz5Omdx3+ds6lLEKp79Kwm02Kc=.sha256",
      value: {
        previous: "%IU4a9V1ieToeUE2SXoqQXH0DMI0/alvxoEkGFjhoZeY=.sha256",
        sequence: 389,
        author: "@mfY4X9Gob0w2oVfFv+CpX56PfL0GZ2RNQkc51SJlMvc=.ed25519",
        timestamp: 1588479011745,
        hash: "sha256",
        content: {
          type: "post",
          root: "%RRIlEQi1Mo75X5pKdJ5HOnxRU+4n2bclwIDqiLpCWf0=.sha256",
          branch: "%RRIlEQi1Mo75X5pKdJ5HOnxRU+4n2bclwIDqiLpCWf0=.sha256",
          reply: {
            "%RRIlEQi1Mo75X5pKdJ5HOnxRU+4n2bclwIDqiLpCWf0=.sha256":
              "@EaYYQo5nAQRabB9nxAn5i2uiIZ665b90Qk2U/WHNVE8=.ed25519",
          },
          channel: null,
          recps: null,
          text: `It's ${Date()}. This is very cool. I sometimes get mantis pods to eat pests in the garden or on our fruit trees. \n\nIt's good that you noticed that they hatched - supposedly they'll start eating each other if you leave them unattended for too long. Then I think the last one standing is the boss you have to fight to level up.\n\nIt's always so weird and cool to see them so small and in such huge numbers.`,
          mentions: [],
        },
        signature:
          "y5ixxWK/Z7R+8q7FbgImgQWKQJ+HZXqyOi9HXNPr2m8BvOHXV2zFPt/scz7Eq+1Sn1eCi7WFYK2pL+2Xk4wmCw==.sig.ed25519",
      },
      timestamp: 1588479014165,
      rts: 1588479011745,
    },
    {
      key: "%bpmnlkq5tf5GLhV4gt8z8rZ8gsvIE55+KpRZomWug6o=.sha256",
      value: {
        previous: "%KlYtnEt6tnVzCdjVxkye/Yy+P2Tuu7/pORBjxqvpa4M=.sha256",
        sequence: 17384,
        author: "@+oaWWDs8g73EZFUMfW37R/ULtFEjwKN/DczvdYihjbU=.ed25519",
        timestamp: 1588466897752,
        hash: "sha256",
        content: {
          type: "post",
          text:
            "[@Powersource](@Vz6v3xKpzViiTM/GAe+hKkACZSqrErQQZgv4iqQxEn8=.ed25519)\r\n\r\nIt depends on the implementation, but I'd expect that mentions won't work unless the client specifically supports your message type.",
          mentions: [
            {
              link: "@Vz6v3xKpzViiTM/GAe+hKkACZSqrErQQZgv4iqQxEn8=.ed25519",
              name: "Powersource",
            },
          ],
          root: "%jK2xn0GE975NzHfAridPvdraqDx3dM60i9UVL7JRSiE=.sha256",
          branch: [
            "%1O8ZJGxOnhZ624m1nMYM57xLv3LqPDCF/q9DedaPlRc=.sha256",
            "%nrrnKl8YJQYHWmyEjTJevOJdb7/3wcNLKoLG+z2S00c=.sha256",
          ],
        },
        signature:
          "winljHJAxDLAvRa0uc0nYQvtDh3czkHCVvzKQ+eMH+tV07EGY16z947JZ2X+djctkI6baYpaWkpezXGXc87nAg==.sig.ed25519",
      },
      timestamp: 1588466900188,
      rts: 1588466897752,
    },
  ];

  res.set("Cache-Control", `public, max-age=${ONE_WEEK}`);
  res.json(posts);
});

router.get("/debug", { public: true }, async (req, res) => {
  const query = req.query || {};

  const entries = await queries.getAllEntries(query);
  entries.map((x) => {
    x.value = JSON.stringify(x.value);
  });

  res.json({ entries, query });
});

router.get("/profile/:id(*)", {}, async (req, res) => {
  const id = req.params.id;

  const [
    profile,
    posts,
    friends,
    communities,
    friendshipStatus,
    description,
  ] = await Promise.all([
    queries.getProfile(id),
    queries.getPosts({ id }),
    queries.getFriends({ id }),
    queries.getProfileCommunities(id),
    queries.getFriendshipStatus(req.context.key.id, id),
    queries.latestOwnerValue({ key: "description", dest: id }),
  ]);

  res.set("Cache-Control", `public, max-age=${ONE_WEEK}`);
  res.json({
    profile,
    posts,
    friends,
    communities,
    friendshipStatus,
    description,
  });
});

router.get("/secrets/:id(*)", async (req, res) => {
  const secretMessages = await queries.getSecretMessages({
    id: req.context.key.id,
  });

  res.set("Cache-Control", `public, max-age=${ONE_WEEK}`);
  res.json(secretMessages);
});

router.post("/vanish", async (req, res) => {
  const keys = req.body.keys;

  for (const key of keys) {
    debug("Vanishing message", key);
    await ssb.client().identities.publishAs({
      key: req.context.key,
      private: false,
      content: {
        type: "delete",
        dest: key,
      },
    });
  }

  res.json({ result: "ok" });
});

router.post("/profile/:id(*)/publish", async (req, res) => {
  const id = req.params.id;

  if (id == req.context.key.id) {
    // posting to your own wall
    await ssb.client().identities.publishAs({
      key: req.context.key,
      private: false,
      content: {
        type: "post",
        text: req.body.message,
      },
    });
  } else {
    const profile = await queries.getProfile(id);
    const text = `[@${profile.name}](${id}) ${req.body.message}`;
    await ssb.client().identities.publishAs({
      key: req.context.key,
      private: false,
      content: {
        type: "post",
        text: text,
        wall: id,
        mentions: [{ link: id, name: profile.name }],
      },
    });
  }

  res.json({ result: "ok" });
});

router.post("/profile/:id(*)/publish_secret", async (req, res) => {
  const id = req.params.id;

  await ssb.client().identities.publishAs({
    key: req.context.key,
    private: true,
    content: {
      type: "post",
      text: req.body.message,
      recps: [req.context.key.id, id],
    },
  });

  res.json({ result: "ok" });
});

router.get("/communities/:name", async (req, res) => {
  const name = req.params.name;

  const [topics, members, isMember] = await Promise.all([
    queries.getCommunityPosts(name),
    queries.getCommunityMembers(name),
    queries.isMember(req.context.key.id, name),
  ]);

  res.set("Cache-Control", `public, max-age=${ONE_WEEK}`);
  res.json({
    name,
    members,
    isMember: !!isMember,
    topics,
  });
});

router.post("/communities/:name/new", async (req, res) => {
  const name = req.params.name;
  const title = req.body.title;
  const post = req.body.post;

  const topic = await ssb.client().identities.publishAs({
    key: req.context.key,
    private: false,
    content: {
      type: "post",
      title: title,
      text: post,
      channel: name,
    },
  });

  res.json({ name, topicKey: topic.key });
});

router.post("/communities/:name/join", async (req, res) => {
  const name = req.params.name;

  await ssb.client().identities.publishAs({
    key: req.context.key,
    private: false,
    content: {
      type: "channel",
      channel: name,
      subscribed: true,
    },
  });

  res.json({ result: "ok" });
});

router.post("/communities/:name/leave", async (req, res) => {
  const name = req.params.name;

  await ssb.client().identities.publishAs({
    key: req.context.key,
    private: false,
    content: {
      type: "channel",
      channel: name,
      subscribed: false,
    },
  });

  res.json({ result: "ok" });
});

router.post("/communities/:name/:key(*)/publish", async (req, res) => {
  const name = req.params.name;
  const key = req.params.key;
  const reply = req.body.reply;

  await ssb.client().identities.publishAs({
    key: req.context.key,
    private: false,
    content: {
      type: "post",
      text: reply,
      channel: name,
      root: "%" + key,
    },
  });

  res.json({ result: "ok" });
});

router.get("/search", async (req, res) => {
  const query = req.query.query;

  let results = {
    people: [],
    communities: [],
  };
  if (query.length >= 3) {
    results = await queries.search(query);
  }

  res.json(results);
});

router.post("/profile/:id(*)/add_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.key.id) {
    throw "cannot befriend yourself";
  }

  await ssb.client().identities.publishAs({
    key: req.context.key,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: true,
    },
  });

  res.json({ result: "ok" });
});

router.post("/profile/:id(*)/reject_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.key.id) {
    throw "cannot reject yourself";
  }

  await ssb.client().identities.publishAs({
    key: req.context.key,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: false,
    },
  });

  res.json({ result: "ok" });
});

const humanifyKey = (key) => {
  return `
  # WARNING: Never show this to anyone.
  # WARNING: Never edit it or use it on multiple devices at once.
  #
  # This is your SECRET, it gives you magical powers. With your secret you can
  # sign your messages so that your friends can verify that the messages came
  # from you. If anyone learns your secret, they can use it to impersonate you.
  #
  # If you use this secret on more than one device you will create a fork and
  # your friends will stop replicating your content.
  #
  ${JSON.stringify(key)}
  #
  # The only part of this file that's safe to share is your public name:
  #
  #   ${key.id}
  `;
};

router.post("/logout", async (_req, res) => {
  const key = await ssb.client().identities.createNewKey();

  fs.unlinkSync(`${ssbFolder()}/secret`);
  fs.writeFileSync(`${ssbFolder()}/secret`, humanifyKey(key), {
    mode: 0x100,
    flag: "wx",
  });

  fs.writeFileSync(`${ssbFolder()}/logged-out`, "");

  res.json({ result: "ok" });
});

router.post("/signup", { public: true }, async (req, res) => {
  const name = req.body.name;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssb.client(), picture));

  const key = ssbKeys.loadSync(`${ssbFolder()}/secret`);
  const debugKey = Object.assign({}, key, { private: "[removed]" });
  debug("Creating new account with key", debugKey);

  await ssb.client().identities.publishAs({
    key,
    private: false,
    content: Object.assign(
      {
        type: "about",
        about: key.id,
        name: name,
      },
      pictureLink ? { image: pictureLink } : {}
    ),
  });

  debug("Published about", { about: key.id, name, image: pictureLink });

  fs.unlinkSync(`${ssbFolder()}/logged-out`);
  res.json({ result: "ok" });
});

router.get("/pubs", { public: true }, async (_req, res) => {
  const peers = await ssb.client().gossip.peers();

  res.json({ peers });
});

router.post("/pubs/add", async (req, res) => {
  const inviteCode = req.body.invite_code;

  await ssb.client().invite.accept(inviteCode);

  res.json({ result: "ok" });
});

router.post("/about", async (req, res) => {
  const { name, description } = req.body;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssb.client(), picture));

  let profile = await queries.getProfile(req.context.key.id);

  let update = {};
  if (name && name != profile.name) {
    update.name = name;
  }
  if (description && description != profile.description) {
    update.description = description;
  }
  if (pictureLink) {
    update.image = pictureLink;
  }

  if (update.name || update.image || update.description) {
    await ssb.client().identities.publishAs({
      key: req.context.key,
      private: false,
      content: Object.assign(
        {
          type: "about",
          about: profile.id,
        },
        update
      ),
    });

    profile = await queries.getProfile(profile.id);
    queries.profileCache[profile.id] = Object.assign(profile, update);
  }

  res.json({ result: "ok" });
});

router.get("/blob/*", { public: true }, (req, res) => {
  serveBlobs(ssb.client())(req, res);
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
