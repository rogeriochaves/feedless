const queries = require("./queries");
const ssb = require("./ssb-client");

module.exports.setupRoutes = (router) => {
  router.get(
    "/mobile",
    { public: true, desktopVersion: "/" },
    async (req, res) => {
      if (!req.context.profile) {
        return res.render("index");
      }

      const posts = await queries.getPosts(req.context.profile);

      res.render("mobile/home", {
        posts,
        profile: req.context.profile,
        layout: "mobile/_layout",
      });
    }
  );

  router.get("/mobile/secrets", { desktopVersion: "/" }, async (req, res) => {
    const [friends, secretMessages] = await Promise.all([
      queries.getFriends(req.context.profile),
      queries.getSecretMessages(req.context.profile),
    ]);

    res.render("mobile/secrets", {
      friends,
      secretMessages,
      profile: req.context.profile,
      layout: "mobile/_layout",
    });
  });

  router.get("/mobile/friends", { desktopVersion: "/" }, async (req, res) => {
    const friends = await queries.getFriends(req.context.profile);

    res.render("mobile/friends", {
      friends,
      profile: req.context.profile,
      layout: "mobile/_layout",
    });
  });

  router.get(
    "/mobile/profile/:id(*)",
    { desktopVersion: "/profile/:id" },
    async (req, res) => {
      const id = req.params.id;

      if (id == req.context.profile.id) {
        return res.redirect("/mobile");
      }

      const [profile, posts, friends, friendshipStatus] = await Promise.all([
        queries.getProfile(id),
        queries.getPosts({ id }),
        queries.getFriends({ id }),
        queries.getFriendshipStatus(req.context.profile.id, id),
      ]);

      res.render("mobile/profile", {
        profile,
        posts,
        friends,
        friendshipStatus,
        layout: "mobile/_layout",
      });
    }
  );

  router.get(
    "/mobile/communities",
    { desktopVersion: "/communities" },
    async (_req, res) => {
      const communities = await queries.getCommunities();

      res.render("mobile/communities/list", {
        communities,
        layout: "mobile/_layout",
      });
    }
  );

  router.get(
    "/mobile/communities/:name",
    { desktopVersion: "/communities/:name" },
    async (req, res) => {
      const name = req.params.name;

      const posts = await queries.getCommunityPosts(name);

      res.render("mobile/communities/community", {
        community: { name },
        posts,
        layout: "mobile/_layout",
      });
    }
  );
};
