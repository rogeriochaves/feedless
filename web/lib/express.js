const ssb = require("./ssb-client");
const express = require("express");
const app = express();
const port = process.env.PORT || 7624;
const bodyParser = require("body-parser");
const {
  asyncRouter,
  writeKey,
  nextIdentityFilename,
  reconstructKeys,
  readKey,
  uploadPicture,
  identityFilename,
  ssbFolder,
  isPhone,
} = require("./utils");
const queries = require("./queries");
const serveBlobs = require("./serve-blobs");
const cookieParser = require("cookie-parser");
const debug = require("debug")("express");
const fileUpload = require("express-fileupload");
const Sentry = require("@sentry/node");
const metrics = require("./metrics");
const sgMail = require("@sendgrid/mail");
const ejs = require("ejs");
const cookieEncrypter = require("cookie-encrypter");
const expressLayouts = require("express-ejs-layouts");
const mobileRoutes = require("./mobile-routes");
const ejsUtils = require("ejs/lib/utils");

let mode = process.env.MODE || "client";

let profileUrl = (id, path = "") => {
  return `/profile/${id}${path}`;
};

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN && process.env.NODE_ENV == "production") {
  Sentry.init({
    dsn: SENTRY_DSN,
  });
  // Sentry request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", `${__dirname}/../views`);
app.use(express.static(`${__dirname}/../public`));
app.use(fileUpload());
const cookieSecret =
  process.env.COOKIES_SECRET || "set_cookie_secret_you_are_unsafe"; // has to be 32-bits
const cookieOptions = {
  httpOnly: true,
  signed: true,
  expires: new Date(253402300000000), // Friday, 31 Dec 9999 23:59:59 GMT, nice date from stackoverflow
  sameSite: "Lax",
};
app.use(cookieParser(cookieSecret));
if (mode != "client") {
  app.use(cookieEncrypter(cookieSecret));
}
app.use(expressLayouts);
app.set("layout", false);
app.use(async (req, res, next) => {
  if (!ssb.client()) {
    setTimeout(() => {
      console.log("Waiting for SSB to load...");

      res.redirect("/");
    }, 500);
    return;
  }

  req.context = {
    syncing: ssb.isSyncing(),
  };
  res.locals.context = req.context;
  try {
    const identities = await ssb.client().identities.list();
    const key = req.signedCookies["ssb_key"];
    if (!key) return next();

    const parsedKey = JSON.parse(key);
    if (!identities.includes(parsedKey.id)) {
      const filename = await nextIdentityFilename(ssb.client());

      writeKey(key, `/identities/${filename}`);
      ssb.client().identities.refresh();
    }
    req.context.profile = await queries.getProfile(parsedKey.id);

    const isRootUser =
      req.context.profile.id == ssb.client().id ||
      process.env.NODE_ENV != "production";

    req.context.profile.debug = isRootUser;
    req.context.profile.admin = isRootUser || mode == "client";

    next();
  } catch (e) {
    next(e);
  }
});
app.use((_req, res, next) => {
  res.locals.profileUrl = profileUrl;
  res.locals.imageUrl = (blob) => {
    const imageHash = blob && typeof blob == "object" ? blob.link : blob;

    return imageHash && `/blob/${encodeURIComponent(imageHash)}`;
  };
  res.locals.profileImageUrl = (profile) => {
    if (profile.image) {
      return res.locals.imageUrl(profile.image);
    }
    return "/images/no-avatar.png";
  };

  const BLOB_PATTERN = /(&.*?=\.sha\d+)/g;
  res.locals.topicTitle = (post) => {
    const title = res.locals
      .escapeMarkdown(post.content.title || post.content.text)
      .replace(BLOB_PATTERN, "");
    if (title.length > 60) {
      return title.substr(0, 60) + "...";
    }
    return title;
  };
  res.locals.escapeMarkdown = (str) => {
    let result = ejsUtils.escapeXML(str);
    result = result.replace(/!\[.*?\]\((.*?)\)/g, `$1`); // Images
    result = result.replace(/\[(@.*?)\]\(@.*?\)/g, `$1`); // Link to mention
    result = result.replace(/\[.*?\]\((.*?)\)/g, `$1`); // Any Link
    result = result.replace(/^#+ /gm, "");
    return result;
  };
  res.locals.htmlify = (str) => {
    let result = str;
    result = result.replace(
      /(\s|^)&amp;(\S*?=\.sha\d+)/g, // Blobs
      `$1<a target="_blank" href="/blob/&$2">&$2</a>`
    );
    result = result.replace(
      /(https?:\/\/\S+)/g, // Urls with http in front
      `<a target="_blank" href="$1">$1</a>`
    );
    result = result.replace(
      /(\s|^)(([a-z-_])*(\.[^\s.]{2,})+)/gm, // Domains without http
      `$1<a target="_blank" href="http://$2">$2</a>`
    );
    result = result.replace(/\n/g, "<br />");
    return result;
  };
  next();
});

const router = asyncRouter(app);
mobileRoutes.setupRoutes(router);

router.get(
  "/",
  { public: true, mobileVersion: "/mobile" },
  async (req, res) => {
    if (!req.context.profile) {
      return res.render("shared/index");
    }

    const [posts, friends, secretMessages, communities] = await Promise.all([
      queries.getPosts(req.context.profile),
      queries.getFriends(req.context.profile),
      queries.getSecretMessages(req.context.profile),
      queries.getProfileCommunities(req.context.profile.id),
    ]);
    res.render("desktop/home", {
      posts,
      friends,
      secretMessages,
      communities,
      profile: req.context.profile,
    });
  }
);

router.get("/login", { public: true }, (_req, res) => {
  res.render("shared/login", { mode });
});

router.post("/login", { public: true }, async (req, res) => {
  const submittedKey =
    req.files && req.files.ssb_key
      ? req.files.ssb_key.data.toString()
      : req.body.ssb_key || req.body.x_ssb_key; // x_ssb_key is because hotmail for some reason appends the x_

  try {
    const decodedKey = reconstructKeys(submittedKey);
    res.cookie("ssb_key", JSON.stringify(decodedKey), cookieOptions);

    decodedKey.private = "[removed]";
    debug("Login with key", decodedKey);

    await queries.autofollow(decodedKey.id);

    res.redirect("/");
  } catch (e) {
    debug("Error on login", e);
    res.send("Invalid key");
  }
});

router.get("/download", { public: true }, (_req, res) => {
  res.render("shared/download");
});

router.get("/logout", async (_req, res) => {
  res.clearCookie("ssb_key");
  res.redirect("/");
});

router.get("/signup", { public: true }, (req, res) => {
  if (req.context.profile) {
    return res.redirect("/");
  }

  res.render("shared/signup", { mode });
});

router.post("/signup", { public: true }, async (req, res) => {
  const name = req.body.name;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssb.client(), picture));

  const filename = await nextIdentityFilename(ssb.client());
  const profileId = await ssb.client().identities.create();
  const key = readKey(`/identities/${filename}`);
  if (key.id != profileId)
    throw "profileId and key.id don't match, probably race condition, bailing out for safety";

  debug("Created new user with id", profileId);

  res.cookie("ssb_key", JSON.stringify(key), cookieOptions);
  key.private = "[removed]";
  debug("Generated key", key);

  await ssb.client().identities.publishAs({
    id: profileId,
    private: false,
    content: {
      type: "about",
      about: profileId,
      name: name,
      ...(pictureLink ? { image: pictureLink } : {}),
    },
  });
  debug("Published about", { about: profileId, name, image: pictureLink });

  await queries.autofollow(profileId);

  res.redirect("/keys");
});

router.get("/keys", (req, res) => {
  res.render("shared/keys", {
    useEmail: process.env.SENDGRID_API_KEY,
    key: req.signedCookies["ssb_key"],
  });
});

router.post("/keys/email", async (req, res) => {
  const email = req.body.email;
  const origin = req.body.origin;

  let html = await ejs.renderFile("views/shared/email_sign_in.ejs", {
    origin,
    ssb_key: req.signedCookies["ssb_key"],
  });

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email,
    from: "Feedless <rgrchvs@gmail.com>",
    subject: `Login button for ${req.context.profile.name}`,
    html,
  };
  await sgMail.send(msg);

  res.redirect("/");
});

router.get("/keys/copy", (req, res) => {
  res.render("shared/keys_copy", { key: req.signedCookies["ssb_key"] });
});

router.get("/keys/download", async (req, res) => {
  const identities = await ssb.client().identities.list();
  const index = identities.indexOf(req.context.profile.id) - 1;
  const filename = identityFilename(index);
  const secretPath = `${ssbFolder()}/identities/${filename}`;

  res.attachment("secret");
  res.sendFile(secretPath);
});

router.get(
  "/profile/:id(*)",
  { mobileVersion: "/mobile/profile/:id" },
  async (req, res) => {
    const id = req.params.id;

    if (id == req.context.profile.id) {
      return res.redirect("/");
    }

    const [
      profile,
      posts,
      friends,
      friendshipStatus,
      communities,
    ] = await Promise.all([
      queries.getProfile(id),
      queries.getPosts({ id }),
      queries.getFriends({ id }),
      queries.getFriendshipStatus(req.context.profile.id, id),
      queries.getProfileCommunities(id),
    ]);

    res.render("desktop/profile", {
      profile,
      posts,
      friends,
      friendshipStatus,
      communities,
    });
  }
);

router.post("/profile/:id(*)/add_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot befriend yourself";
  }

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: true,
    },
  });

  res.redirect(profileUrl(id));
});

router.post("/profile/:id(*)/reject_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot reject yourself";
  }

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: false,
    },
  });

  res.redirect(profileUrl(id));
});

router.post("/publish", async (req, res) => {
  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "post",
      text: req.body.message,
      root: req.context.profile.id,
    },
  });

  res.redirect("/");
});

router.post("/publish_secret", async (req, res) => {
  const recipients = req.body.recipients;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: true,
    content: {
      type: "post",
      text: req.body.message,
      recps: [req.context.profile.id].concat(recipients.split(",")),
    },
  });

  res.redirect("/");
});

// TODO: tie reading with deleting
router.post("/vanish", async (req, res) => {
  const keys = req.body.keys.split(",");

  for (const key of keys) {
    await ssb.client().identities.publishAs({
      id: req.context.profile.id,
      private: false,
      content: {
        type: "delete",
        dest: key,
      },
    });
  }

  res.send("ok");
});

router.post("/profile/:id(*)/publish", async (req, res) => {
  const id = req.params.id;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "post",
      text: req.body.message,
      root: id,
    },
  });

  res.redirect(profileUrl(id));
});

router.post("/profile/:id(*)/publish_secret", async (req, res) => {
  const id = req.params.id;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: true,
    content: {
      type: "post",
      text: req.body.message,
      recps: [req.context.profile.id, id],
    },
  });

  res.redirect(profileUrl(id));
});

router.get("/pubs", async (_req, res) => {
  const invite = await ssb.client().invite.create({ uses: 10 });
  const peers = await ssb.client().gossip.peers();

  res.render("desktop/pubs", { invite, peers });
});

router.post("/pubs/add", async (req, res) => {
  const inviteCode = req.body.invite_code;

  await ssb.client().invite.accept(inviteCode);

  res.redirect("/");
});

router.get("/about", { mobileVersion: "/mobile/about" }, (_req, res) => {
  res.render("desktop/about");
});

router.post("/about", async (req, res) => {
  const { name, description } = req.body;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssb.client(), picture));

  let update = {
    type: "about",
    about: req.context.profile.id,
  };
  if (name && name != req.context.profile.name) {
    update.name = name;
  }
  if (description && description != req.context.profile.description) {
    update.description = description;
  }
  if (pictureLink) {
    update.image = pictureLink;
  }

  if (update.name || update.image || update.description) {
    await ssb.client().identities.publishAs({
      id: req.context.profile.id,
      private: false,
      content: update,
    });

    delete queries.profileCache[req.context.profile.id];
  }

  res.redirect("/");
});

router.get(
  "/communities",
  { mobileVersion: "/mobile/communities" },
  async (req, res) => {
    const [communities, participating] = await Promise.all([
      queries.getCommunities(),
      queries.getProfileCommunities(req.context.profile.id),
    ]);

    res.render("desktop/communities/list", { communities, participating });
  }
);

router.get(
  "/communities/new",
  { mobileVersion: "/mobile/communities/new" },
  async (_req, res) => {
    res.render("desktop/communities/new");
  }
);

router.post("/communities/new", async (req, res) => {
  const name = req.body.name;
  if (!name.match(/^[a-z0-9-]+$/)) {
    res.send("Invalid community name");
    return;
  }

  const title = req.body.title;
  const post = req.body.post;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "post",
      title: title,
      text: post,
      channel: name,
    },
  });

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "channel",
      channel: name,
      subscribed: true,
    },
  });

  res.redirect(`/communities/${name}`);
});

const communityData = (req) => {
  const name = req.params.name;
  return Promise.all([
    queries.getCommunityMembers(name),
    queries.isMember(req.context.profile.id, name),
  ]).then(([members, isMember]) => ({
    name,
    members,
    isMember,
  }));
};

router.get(
  "/communities/:name",
  { mobileVersion: "/mobile/communities/:name" },
  async (req, res) => {
    const name = req.params.name;

    const [community, posts] = await Promise.all([
      communityData(req),
      queries.getCommunityPosts(name),
    ]);

    res.render("desktop/communities/community", {
      community,
      posts,
      layout: "desktop/communities/_layout",
    });
  }
);

router.get(
  "/communities/:name/new",
  { mobileVersion: "/mobile/communities/:name/new" },
  async (req, res) => {
    const community = await communityData(req);

    res.render("desktop/communities/new_topic", {
      community,
      layout: "desktop/communities/_layout",
    });
  }
);

router.post("/communities/:name/new", async (req, res) => {
  const name = req.params.name;
  const title = req.body.title;
  const post = req.body.post;

  const topic = await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "post",
      title: title,
      text: post,
      channel: name,
    },
  });

  res.redirect(`/communities/${name}/${topic.key.replace("%", "")}`);
});

router.post("/communities/:name/join", async (req, res) => {
  const name = req.params.name;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "channel",
      channel: name,
      subscribed: true,
    },
  });

  res.redirect(`/communities/${name}`);
});

router.post("/communities/:name/leave", async (req, res) => {
  const name = req.params.name;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "channel",
      channel: name,
      subscribed: false,
    },
  });

  res.redirect(`/communities/${name}`);
});

router.post("/communities/:name/:key(*)/publish", async (req, res) => {
  const name = req.params.name;
  const key = req.params.key;
  const reply = req.body.reply;

  await ssb.client().identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "post",
      text: reply,
      channel: name,
      root: "%" + key,
    },
  });

  res.redirect(`/communities/${name}/${key}`);
});

router.get(
  "/communities/:name/:key(*)",
  { mobileVersion: "/mobile/communities/:name/:key" },
  async (req, res) => {
    const name = req.params.name;
    const key = "%" + req.params.key;

    const [community, posts] = await Promise.all([
      communityData(req),
      queries.getPostWithReplies(name, key),
    ]);

    res.render("desktop/communities/topic", {
      posts,
      community,
      layout: "desktop/communities/_layout",
    });
  }
);

router.get("/search", { mobileVersion: "/mobile/search" }, async (req, res) => {
  const query = req.query.query;

  let results = {
    people: [],
    communities: [],
  };
  if (query.length >= 3) {
    results = await queries.search(query);
    metrics.searchResultsPeople.observe(results.people.length);
    metrics.searchResultsCommunities.observe(results.communities.length);
  }

  res.render("desktop/search", { ...results, query });
});

router.get("/blob/*", { public: true }, (req, res) => {
  serveBlobs(ssb.client())(req, res);
});

router.get("/syncing", (req, res) => {
  res.json({ syncing });
});

router.get("/debug", async (req, res) => {
  const query = req.query || {};

  const entries = await queries.getAllEntries(query);

  res.render("desktop/debug", { entries, query });
});

router.get("/debug-error", (_req, res) => {
  const object = {};
  object.isUndefinedAFunction();

  res.send("should never reach here");
});

router.post("/frontend-error", (req, res) => {
  const message = req.body.message;
  const stacktrace = req.body.stacktrace;

  if (SENTRY_DSN && process.env.NODE_ENV == "production") {
    Sentry.captureEvent({
      message,
      stacktrace,
    });
  }

  res.send("ok");
});

router.get("/metrics", { public: true }, (_req, res) => {
  res.set("Content-Type", metrics.register.contentType);
  res.end(metrics.register.metrics());
});

if (SENTRY_DSN && process.env.NODE_ENV == "production") {
  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());
}

app.use((error, req, res, _next) => {
  res.statusCode = 500;
  if (isPhone(req)) {
    res.render("mobile/error", { error, layout: "mobile/_layout" });
  } else {
    res.render("desktop/error", { error });
  }
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
