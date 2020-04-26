const queries = require("./queries");
const metrics = require("./metrics");

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

  router.get("/mobile/about", { desktopVersion: "/about" }, (_req, res) => {
    res.render("mobile/about", { layout: "mobile/_layout" });
  });

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

      const [posts, members] = await Promise.all([
        queries.getCommunityPosts(name),
        queries.getCommunityMembers(name),
      ]);

      res.render("mobile/communities/community", {
        community: { name, members },
        posts,
        layout: "mobile/_layout",
      });
    }
  );

  router.get(
    "/mobile/communities/:name/new",
    { desktopVersion: "/communities/:name/new" },
    async (req, res) => {
      const name = req.params.name;

      res.render("mobile/communities/new_topic", {
        community: { name },
        layout: "mobile/_layout",
      });
    }
  );

  router.get(
    "/mobile/communities/:name/:key(*)",
    { desktopVersion: "/communities/:name/:key" },
    async (req, res) => {
      const name = req.params.name;
      const key = "%" + req.params.key;

      const posts = await queries.getPostWithReplies(name, key);

      res.render("mobile/communities/topic", {
        posts,
        community: { name },
        layout: "mobile/_layout",
      });
    }
  );

  router.get(
    "/mobile/search",
    { desktopVersion: "/search" },
    async (req, res) => {
      const query = req.query.query || "";

      let results = {
        people: [],
        communities: [],
      };
      if (query.length >= 3) {
        results = await queries.search(query);
        metrics.searchResultsPeople.observe(results.people.length);
        metrics.searchResultsCommunities.observe(results.communities.length);
      }

      res.render("mobile/search", {
        ...results,
        query,
        layout: "mobile/_layout",
      });
    }
  );
};
