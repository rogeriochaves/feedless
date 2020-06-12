const ssb = require("./ssb-client");
const express = require("express");
const app = express();
const port = process.env.PORT || 7624;
const bodyParser = require("body-parser");
const {
  asyncRouter,
  reconstructKeys,
  uploadPicture,
  isPhone,
  ssbFolder,
} = require("./utils");
const queries = require("./queries");
const serveBlobs = require("./serve-blobs");
const cookieParser = require("cookie-parser");
const debug = require("debug")("express");
const fileUpload = require("express-fileupload");
const metrics = require("./metrics");
const sgMail = require("@sendgrid/mail");
const ejs = require("ejs");
const cookieEncrypter = require("cookie-encrypter");
const expressLayouts = require("express-ejs-layouts");
const mobileRoutes = require("./mobile-routes");
const ejsUtils = require("ejs/lib/utils");
const fs = require("fs");
const ssbKeys = require("ssb-keys");
const { sentry } = require("./errors");

const mode = process.env.MODE || "standalone";

const profileUrl = (id, path = "") => {
  return `/profile/${id}${path}`;
};

if (sentry) {
  // Sentry request handler must be the first middleware on the app
  app.use(sentry.Handlers.requestHandler());
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", `${__dirname}/../views`);
app.use(express.static(`${__dirname}/../public`));
app.use(fileUpload());

const cookieOptions = {
  httpOnly: true,
  signed: true,
  expires: new Date(253402300000000), // Friday, 31 Dec 9999 23:59:59 GMT, nice date from stackoverflow
  sameSite: "Lax",
};
if (mode != "standalone") {
  const cookieSecret =
    process.env.COOKIES_SECRET || "set_cookie_secret_you_are_unsafe"; // has to be 32-bits

  app.use(cookieParser(cookieSecret));
  app.use(cookieEncrypter(cookieSecret));
}
app.use(expressLayouts);
app.set("layout", false);
app.use(async (req, res, next) => {
  if (!ssb.client()) {
    setTimeout(() => {
      console.log("Waiting for SSB to load...");

      res.redirect(req.originalUrl);
    }, 500);
    return;
  }

  req.context = {
    status: ssb.getStatus(),
  };
  res.locals.context = req.context;

  let key;
  try {
    if (mode == "standalone") {
      const isLoggedOut = fs.existsSync(`${ssbFolder()}/logged-out`);

      key = !isLoggedOut && ssbKeys.loadSync(`${ssbFolder()}/secret`);
    } else {
      key = req.signedCookies["ssb_key"];
      if (key) key = JSON.parse(key);
    }
  } catch (_) {}
  if (!key || !key.id) return next();

  ssb.client().identities.addUnboxer(key);
  req.context.profile = (await queries.getProfile(key.id)) || {};
  req.context.profile.key = key;

  const isRootUser =
    req.context.profile.id == ssb.client().id ||
    process.env.NODE_ENV != "production";

  req.context.profile.admin = isRootUser;

  next();
});
app.use((_req, res, next) => {
  res.locals.profileUrl = profileUrl;
  res.locals.imageUrl = (imageHash) => {
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
    let result = str;
    result = result.replace(/!\[.*?\]\((.*?)\)/g, `$1`); // Images
    result = result.replace(/\[(@.*?)\]\(@.*?\)/g, `$1`); // Link to mention
    result = result.replace(/\[.*?\]\((.*?)\)/g, `$1`); // Any Link
    result = result.replace(/^#+ /gm, "");
    return result;
  };
  res.locals.htmlify = (str) => {
    let result = ejsUtils.escapeXML(str);
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
    result = result.replace(
      /(\s|^)#([a-z0-9-]+)/g, // Communities
      `$1<a href="/communities/$2">#$2</a>`
    );
    result = result.replace(/\n/g, "<br />");
    return result;
  };
  res.locals.splittedPosts = (post, limit) => {
    let text = res.locals.escapeMarkdown(post.content.text);

    if (text.length <= limit) {
      return [text];
    }

    let splittedPosts = [];
    let words = text.split(" ");
    let nextPost = "";
    for (let word of words) {
      const postsCount = splittedPosts.length + 1;
      const pageMarker = `${postsCount}/`;

      if (nextPost.length + word.length + pageMarker.length + 1 < limit) {
        nextPost += word + " ";
      } else {
        if (nextPost.length > 0) {
          splittedPosts.push(nextPost + pageMarker);
        }
        nextPost = word + " ";
      }
    }
    const postsCount = splittedPosts.length + 1;
    const lastMarker = postsCount > 1 ? `${postsCount}/${postsCount}` : "";
    splittedPosts.push(nextPost + lastMarker);

    return splittedPosts.reverse();
  };
  res.locals.timeSince = (date) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
      const dateTimeFormat = new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
      return dateTimeFormat.format(new Date(date));
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + " days ago";
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + " hours ago";
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + " minutes ago";
    return "just now";
  };
  res.locals.getBranchKey = (post) => {
    let branch = post.value.content.branch;
    let branchKey = typeof branch == "string" ? branch : branch[0];
    return branchKey;
  };

  next();
});

const router = asyncRouter(app);
mobileRoutes.setupRoutes(router);

router.get(
  "/",
  { public: true, mobileVersion: "/mobile" },
  async (req, res) => {
    if (req.context.profile) {
      return res.redirect(`/profile/${req.context.profile.id}`);
    } else {
      return res.render("shared/index");
    }
  }
);

const doLogin = async (submittedKey, res) => {
  let decodedKey;
  try {
    decodedKey = reconstructKeys(submittedKey);
  } catch (e) {
    debug("Error on login", e);
    return res.send("Invalid key");
  }

  if (mode == "standalone") {
    fs.unlinkSync(`${ssbFolder()}/secret`);
    fs.writeFileSync(`${ssbFolder()}/secret`, submittedKey, {
      mode: 0x100,
      flag: "wx",
    });
    fs.unlinkSync(`${ssbFolder()}/logged-out`);
  } else {
    res.cookie("ssb_key", JSON.stringify(decodedKey), cookieOptions);
    await queries.autofollow(decodedKey.id);
  }

  decodedKey.private = "[removed]";
  debug("Login with key", decodedKey);

  res.redirect("/");
};

router.get("/login", { public: true }, async (req, res) => {
  const loginKey =
    req.query.key && Buffer.from(req.query.key, "base64").toString("utf8");

  if (loginKey) {
    await doLogin(loginKey, res);
  } else {
    res.render("shared/login", { mode });
  }
});

router.post("/login", { public: true }, async (req, res) => {
  const submittedKey =
    req.files && req.files.ssb_key
      ? req.files.ssb_key.data.toString()
      : req.body.ssb_key;

  await doLogin(submittedKey, res);
});

router.get("/download", { public: true }, (_req, res) => {
  res.render("shared/download");
});

router.get("/logout", async (_req, res) => {
  if (mode == "standalone") {
    fs.writeFileSync(`${ssbFolder()}/logged-out`, "");
  } else {
    res.clearCookie("ssb_key");
  }
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

  const key = await ssb.client().identities.createNewKey();
  if (mode == "standalone") {
    fs.unlinkSync(`${ssbFolder()}/secret`);
    fs.writeFileSync(`${ssbFolder()}/secret`, humanifyKey(key), {
      mode: 0x100,
      flag: "wx",
    });
    fs.unlinkSync(`${ssbFolder()}/logged-out`);
  } else {
    res.cookie("ssb_key", JSON.stringify(key), cookieOptions);
    await queries.autofollow(key.id);
  }

  await ssb.client().identities.publishAs({
    key,
    private: false,
    content: {
      type: "about",
      about: key.id,
      name: name,
      ...(pictureLink ? { image: pictureLink } : {}),
    },
  });

  const debugKey = { ...key, private: "[removed]" };
  debug("Generated key", debugKey);

  debug("Published about", { about: key.id, name, image: pictureLink });

  res.redirect("/keys");
});

router.get("/keys", (req, res) => {
  res.render("shared/keys", {
    useEmail: process.env.SENDGRID_API_KEY,
    key: JSON.stringify(req.context.profile.key),
  });
});

router.post("/keys/email", async (req, res) => {
  /* According to https://security.stackexchange.com/questions/177643/is-emailing-sign-in-links-bad-practice
   * having any keys in the email is not secure, but the alternative to just ask users to copy their key on
   * sign up will not work because users tend to press Next > Next > Next > Done without reading, and it will
   * lead to loss of account access.
   * Solution is to put an email field which they fill without thinking and send them the key by email, asking
   * on the email body to copy the key and delete it later.
   */
  const email = req.body.email;
  const origin = req.body.origin;
  const ssb_key = JSON.stringify(req.context.profile.key);
  const login_key = Buffer.from(ssb_key).toString("base64");

  if (process.env.NODE_ENV == "production") {
    let html = await ejs.renderFile("views/shared/email_sign_in.ejs", {
      origin,
      ssb_key,
      login_key,
    });

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: email,
      from: "Feedless <hello@feedless.social>",
      subject: `Login button for ${req.context.profile.name}`,
      html,
    };
    await sgMail.send(msg);

    res.redirect("/");
  } else {
    res.render("shared/email_sign_in", { origin, ssb_key, login_key });
  }
});

router.get("/keys/copy", (req, res) => {
  res.render("shared/keys_copy", {
    key: JSON.stringify(req.context.profile.key),
  });
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

router.get("/keys/download", async (req, res) => {
  const secretFile = humanifyKey(req.context.profile.key);

  res.contentType("text/plain");
  res.header("Content-Disposition", "attachment; filename=secret");
  res.send(secretFile);
});

router.get(
  "/profile/:id(*)",
  { mobileVersion: "/mobile/profile/:id" },
  async (req, res) => {
    const id = req.params.id;

    if (id == req.context.profile.id) {
      const [posts, friends, secretMessages, communities] = await Promise.all([
        queries.getPosts(req.context.profile.id, req.context.profile),
        queries.getFriends(req.context.profile),
        queries.getSecretMessages(req.context.profile),
        queries.getProfileCommunities(id),
      ]);

      res.render("desktop/home", {
        posts,
        friends,
        secretMessages,
        communities,
        profile: req.context.profile,
      });
    } else {
      const [
        profile,
        posts,
        friends,
        friendshipStatus,
        communities,
      ] = await Promise.all([
        queries.getProfile(id),
        queries.getPosts(req.context.profile.id, { id }),
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
  }
);

router.post("/profile/:id(*)/add_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot befriend yourself";
  }

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
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
    key: req.context.profile.key,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: false,
    },
  });

  res.redirect(profileUrl(id));
});

const publish = async (id, req) => {
  const { mentionId, mentionName, prev, root } = req.body;

  let text = req.body.message;
  let extra = {};
  if (prev) {
    extra.root = root;
    extra.branch = prev;
    extra.mentions = [{ link: mentionId, name: mentionName }];
  }
  if (mentionName) {
    text.replace(`@${mentionName}`, `[@${mentionName}](${mentionId})`);
  }

  // Posting to somebody else's wall when its not a reply
  if (id != req.context.profile.id && !prev) {
    const profile = await queries.getProfile(id);
    text = `[@${profile.name}](${id}) ${req.body.message}`;

    extra.mentions = extra.mentions || [];
    extra.mentions.push({ link: id, name: profile.name });
    extra.wall = id;
  }

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
    private: false,
    content: {
      type: "post",
      text: text,
      ...extra,
    },
  });
};

router.post("/publish", async (req, res) => {
  await publish(req.context.profile.id, req);

  res.redirect("/");
});

router.post("/publish_secret", async (req, res) => {
  const recipients = req.body.recipients;

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
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
    debug("Vanishing message", key);
    await ssb.client().identities.publishAs({
      key: req.context.profile.key,
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

  await publish(id, req);

  res.redirect(profileUrl(id));
});

router.post("/profile/:id(*)/publish_secret", async (req, res) => {
  const id = req.params.id;

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
    private: true,
    content: {
      type: "post",
      text: req.body.message,
      recps: [req.context.profile.id, id],
    },
  });

  res.send("ok");
});

router.get("/pub_invite", { public: true }, async (_req, res) => {
  const invite = await ssb.client().invite.create({ uses: 1 });

  res.json({ invite });
});

router.get("/pubs", async (req, res) => {
  if (!req.context.profile.admin) {
    return res.redirect("/");
  }
  const peers = await ssb.client().gossip.peers();

  res.render("desktop/pubs", { peers });
});

router.post("/pubs/add", async (req, res) => {
  if (!req.context.profile.admin) {
    return res.redirect("/");
  }
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

  let update = {};
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
      key: req.context.profile.key,
      private: false,
      content: {
        type: "about",
        about: req.context.profile.id,
        ...update,
      },
    });

    let profile = await queries.getProfile(req.context.profile.id);
    queries.profileCache[req.context.profile.id] = Object.assign(
      profile,
      update
    );
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
    key: req.context.profile.key,
    private: false,
    content: {
      type: "post",
      title: title,
      text: post,
      channel: name,
    },
  });

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
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
      queries.getCommunityPosts(req.context.profile.id, name),
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
    key: req.context.profile.key,
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
    key: req.context.profile.key,
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
    key: req.context.profile.key,
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
    key: req.context.profile.key,
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
      queries.getPostWithReplies(req.context.profile.id, name, key),
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

router.get(
  "/post/:key(*)",
  { mobileVersion: "/mobile/post/:key" },
  async (req, res) => {
    const key = "%" + req.params.key;

    const posts = await queries.getPost(req.context.profile.id, key);

    res.render("desktop/post", {
      key,
      posts,
    });
  }
);

router.post("/profile/:id(*)/block", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot block yourself";
  }

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: false,
      blocking: true,
    },
  });

  delete queries.userDeletesCache[req.context.profile.id];

  res.redirect(profileUrl(id));
});

router.post("/profile/:id(*)/unblock", async (req, res) => {
  const id = req.params.id;

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
    private: false,
    content: {
      type: "contact",
      contact: id,
      blocking: false,
    },
  });

  delete queries.userDeletesCache[req.context.profile.id];

  res.redirect(profileUrl(id));
});

router.post("/delete/:key(*)", async (req, res) => {
  const key = "%" + req.params.key;

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
    private: false,
    content: {
      type: "delete",
      dest: key,
    },
  });

  delete queries.userDeletesCache[req.context.profile.id];

  res.json({ result: "ok" });
});

router.post("/flag/:key(*)", async (req, res) => {
  const key = "%" + req.params.key;
  const reason = req.body.reason;

  await ssb.client().identities.publishAs({
    key: req.context.profile.key,
    private: false,
    content: {
      type: "flag",
      flag: {
        link: key,
        reason: reason,
      },
    },
  });

  res.json({ result: "ok" });
});

router.get("/blob/*", { public: true }, (req, res) => {
  serveBlobs(ssb.client())(req, res);
});

router.get("/syncing", (req, res) => {
  res.json({ status: req.context.status });
});

router.get("/debug", async (req, res) => {
  if (!req.context.profile.admin) {
    return res.redirect("/");
  }
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

  if (sentry) {
    sentry.captureEvent({
      message,
      stacktrace,
    });
  }

  res.send("ok");
});

router.get("/privacy-policy", { public: true }, async (_req, res) => {
  res.render("shared/privacy_policy");
});

router.get("/metrics", { public: true }, (_req, res) => {
  res.set("Content-Type", metrics.register.contentType);
  res.end(metrics.register.metrics());
});

if (sentry) {
  // The error handler must be before any other error middleware and after all controllers
  app.use(sentry.Handlers.errorHandler());
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
