const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
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

let ssbServer;
let mode = process.env.MODE || "client";

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
let syncing = false;

Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;

  ssbServer = server;
  queries.progress(
    ssbServer,
    ({ rate, feeds, incompleteFeeds, progress, total }) => {
      if (incompleteFeeds > 0) {
        if (!syncing) debug("syncing");
        syncing = true;
      } else {
        syncing = false;
      }

      metrics.ssbProgressRate.set(rate);
      metrics.ssbProgressFeeds.set(feeds);
      metrics.ssbProgressIncompleteFeeds.set(incompleteFeeds);
      metrics.ssbProgressProgress.set(progress);
      metrics.ssbProgressTotal.set(total);
    }
  );
  console.log("SSB Client ready");
});

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
app.use(express.static("public"));
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
app.use(cookieEncrypter(cookieSecret));
app.use(expressLayouts);
app.set("layout", false);
app.use(async (req, res, next) => {
  if (!ssbServer) {
    setTimeout(() => {
      console.log("Waiting for SSB to load...");

      res.redirect("/");
    }, 500);
    return;
  }

  req.context = {
    syncing: syncing,
  };
  res.locals.context = req.context;
  try {
    const identities = await ssbServer.identities.list();
    const key = req.signedCookies["ssb_key"];
    if (!key) return next();

    const parsedKey = JSON.parse(key);
    if (!identities.includes(parsedKey.id)) {
      const filename = await nextIdentityFilename(ssbServer);

      writeKey(key, `/identities/${filename}`);
      ssbServer.identities.refresh();
    }
    req.context.profile = await queries.getProfile(ssbServer, parsedKey.id);

    const isRootUser =
      req.context.profile.id == ssbServer.id ||
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
  res.locals.topicTitle = (post) => {
    const title = post.content.title || post.content.text;
    if (title.length > 60) {
      return title.substr(0, 60) + "...";
    }
    return title;
  };
  next();
});

const router = asyncRouter(app);

router.get("/", { public: true }, async (req, res) => {
  if (!req.context.profile) {
    return res.render("index");
  }
  if (isPhone(req)) {
    return res.redirect("/mobile");
  }

  const [posts, friends, secretMessages] = await Promise.all([
    queries.getPosts(ssbServer, req.context.profile),
    queries.getFriends(ssbServer, req.context.profile),
    queries.getSecretMessages(ssbServer, req.context.profile),
  ]);
  res.render("home", {
    posts,
    friends,
    secretMessages,
    profile: req.context.profile,
  });
});

router.get("/mobile", async (req, res) => {
  if (!isPhone(req)) {
    return res.redirect("/");
  }

  const posts = await queries.getPosts(ssbServer, req.context.profile);

  res.render("mobile/home", {
    posts,
    profile: req.context.profile,
    layout: "mobile/_layout",
  });
});

router.get("/mobile/secrets", async (req, res) => {
  if (!isPhone(req)) {
    return res.redirect("/");
  }

  const secretMessages = await queries.getSecretMessages(ssbServer, req.context.profile);

  res.render("mobile/secrets", {
    secretMessages,
    profile: req.context.profile,
    layout: "mobile/_layout",
  });
});

router.get("/login", { public: true }, (_req, res) => {
  res.render("login", { mode });
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

    await queries.autofollow(ssbServer, decodedKey.id);

    res.redirect("/");
  } catch (e) {
    debug("Error on login", e);
    res.send("Invalid key");
  }
});

router.get("/download", { public: true }, (_req, res) => {
  res.render("download");
});

router.get("/logout", async (_req, res) => {
  res.clearCookie("ssb_key");
  res.redirect("/");
});

router.get("/signup", { public: true }, (req, res) => {
  if (req.context.profile) {
    return res.redirect("/");
  }

  res.render("signup", { mode });
});

router.post("/signup", { public: true }, async (req, res) => {
  const name = req.body.name;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssbServer, picture));

  const filename = await nextIdentityFilename(ssbServer);
  const profileId = await ssbServer.identities.create();
  const key = readKey(`/identities/${filename}`);
  if (key.id != profileId)
    throw "profileId and key.id don't match, probably race condition, bailing out for safety";

  debug("Created new user with id", profileId);

  res.cookie("ssb_key", JSON.stringify(key), cookieOptions);
  key.private = "[removed]";
  debug("Generated key", key);

  await ssbServer.identities.publishAs({
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

  await queries.autofollow(ssbServer, profileId);

  res.redirect("/keys");
});

router.get("/keys", (req, res) => {
  res.render("keys", {
    useEmail: process.env.SENDGRID_API_KEY,
    key: req.signedCookies["ssb_key"],
  });
});

router.post("/keys/email", async (req, res) => {
  const email = req.body.email;
  const origin = req.body.origin;

  let html = await ejs.renderFile("views/email_sign_in.ejs", {
    origin,
    ssb_key: req.signedCookies["ssb_key"],
  });

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email,
    from: "Social <rgrchvs@gmail.com>",
    subject: `Login button for ${req.context.profile.name}`,
    html,
  };
  await sgMail.send(msg);

  res.redirect("/");
});

router.get("/keys/copy", (req, res) => {
  res.render("keys_copy", { key: req.signedCookies["ssb_key"] });
});

router.get("/keys/download", async (req, res) => {
  const identities = await ssbServer.identities.list();
  const index = identities.indexOf(req.context.profile.id) - 1;
  const filename = identityFilename(index);
  const secretPath = `${ssbFolder()}/identities/${filename}`;

  res.attachment("secret");
  res.sendFile(secretPath);
});

router.get("/profile/:id(*)", async (req, res) => {
  const id = req.params.id;

  if (id == req.context.profile.id) {
    return res.redirect("/");
  }

  const [profile, posts, friends, friendshipStatus] = await Promise.all([
    queries.getProfile(ssbServer, id),
    queries.getPosts(ssbServer, { id }),
    queries.getFriends(ssbServer, { id }),
    queries.getFriendshipStatus(ssbServer, req.context.profile.id, id),
  ]);

  res.render("profile", { profile, posts, friends, friendshipStatus });
});

router.post("/profile/:id(*)/add_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot befriend yourself";
  }

  await ssbServer.identities.publishAs({
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

  await ssbServer.identities.publishAs({
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
  await ssbServer.identities.publishAs({
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

  await ssbServer.identities.publishAs({
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
    await ssbServer.identities.publishAs({
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

  await ssbServer.identities.publishAs({
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

  await ssbServer.identities.publishAs({
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
  const invite = await ssbServer.invite.create({ uses: 10 });
  const peers = await ssbServer.gossip.peers();

  res.render("pubs", { invite, peers });
});

router.post("/pubs/add", async (req, res) => {
  const inviteCode = req.body.invite_code;

  await ssbServer.invite.accept(inviteCode);

  res.redirect("/");
});

router.get("/about", (req, res) => {
  res.render("about");
});

router.post("/about", async (req, res) => {
  const { name, description } = req.body;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssbServer, picture));

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
    await ssbServer.identities.publishAs({
      id: req.context.profile.id,
      private: false,
      content: update,
    });

    delete queries.profileCache[req.context.profile.id];
  }

  res.redirect("/");
});

router.get("/communities", async (req, res) => {
  const communities = await queries.getCommunities(ssbServer);

  res.render("communities/list", { communities });
});

const communityData = (req) => {
  const name = req.params.name;
  return queries.getCommunityMembers(ssbServer, name).then((members) => ({
    name,
    members,
  }));
};

router.get("/communities/:name", async (req, res) => {
  const name = req.params.name;

  const [community, posts] = await Promise.all([
    communityData(req),
    queries.getCommunityPosts(ssbServer, name),
  ]);

  res.render("communities/community", {
    community,
    posts,
    layout: "communities/_layout",
  });
});

router.get("/communities/:name/new", async (req, res) => {
  const community = await communityData(req);

  res.render("communities/new_topic", {
    community,
    layout: "communities/_layout",
  });
});

router.post("/communities/:name/new", async (req, res) => {
  const name = req.params.name;
  const title = req.body.title;
  const post = req.body.post;

  const topic = await ssbServer.identities.publishAs({
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

router.post("/communities/:name/:key(*)/publish", async (req, res) => {
  const name = req.params.name;
  const key = req.params.key;
  const reply = req.body.reply;

  await ssbServer.identities.publishAs({
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

router.get("/communities/:name/:key(*)", async (req, res) => {
  const name = req.params.name;
  const key = "%" + req.params.key;

  const [community, posts] = await Promise.all([
    communityData(req),
    queries.getPostWithReplies(ssbServer, name, key),
  ]);

  res.render("communities/topic", {
    posts,
    community,
    layout: "communities/_layout",
  });
});

router.get("/search", async (req, res) => {
  const query = req.query.query;

  let results = {
    people: [],
    communities: [],
  };
  if (query.length >= 3) {
    results = await queries.search(ssbServer, query);
    metrics.searchResultsPeople.observe(results.people.length);
    metrics.searchResultsCommunities.observe(results.communities.length);
  }

  res.render("search", { ...results, query });
});

router.get("/blob/*", { public: true }, (req, res) => {
  serveBlobs(ssbServer)(req, res);
});

router.get("/syncing", (req, res) => {
  res.json({ syncing });
});

router.get("/debug", async (req, res) => {
  const query = req.query || {};

  const entries = await queries.getAllEntries(ssbServer, query);

  res.render("debug", { entries, query });
});

router.get("/debug-error", (_req, res) => {
  const object = {};
  object.isUndefinedAFunction();

  res.send("should never reach here");
});

router.get("/metrics", (_req, res) => {
  res.set("Content-Type", metrics.register.contentType);
  res.end(metrics.register.metrics());
});

if (SENTRY_DSN && process.env.NODE_ENV == "production") {
  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());
}

app.use((error, _req, res, _next) => {
  res.statusCode = 500;
  res.render("error", { error });
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
