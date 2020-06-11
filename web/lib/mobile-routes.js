const queries = require("./queries");
const metrics = require("./metrics");

module.exports.setupRoutes = (router) => {
  router.get(
    "/mobile",
    { public: true, desktopVersion: "/" },
    async (req, res) => {
      if (req.context.profile) {
        return res.redirect(`/mobile/profile/${req.context.profile.id}`);
      } else {
        return res.render("shared/index");
      }
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
        const posts = await queries.getPosts(
          req.context.profile.id,
          req.context.profile
        );

        res.render("mobile/home", {
          posts,
          profile: req.context.profile,
          layout: "mobile/_layout",
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

        res.render("mobile/profile", {
          profile,
          posts,
          friends,
          friendshipStatus,
          communities,
          layout: "mobile/_layout",
        });
      }
    }
  );

  router.get("/mobile/about", { desktopVersion: "/about" }, (_req, res) => {
    res.render("mobile/about", { layout: "mobile/_layout" });
  });

  router.get(
    "/mobile/communities",
    { desktopVersion: "/communities" },
    async (req, res) => {
      const [communities, participating] = await Promise.all([
        queries.getCommunities(),
        queries.getProfileCommunities(req.context.profile.id),
      ]);

      res.render("mobile/communities/list", {
        communities,
        participating,
        layout: "mobile/_layout",
      });
    }
  );

  router.get(
    "/mobile/communities/new",
    { desktopVersion: "/communities/new" },
    async (_req, res) => {
      res.render("mobile/communities/new", { layout: "mobile/_layout" });
    }
  );

  router.get(
    "/mobile/communities/:name",
    { desktopVersion: "/communities/:name" },
    async (req, res) => {
      const name = req.params.name;

      const [posts, members, isMember] = await Promise.all([
        queries.getCommunityPosts(req.context.profile.id, name),
        queries.getCommunityMembers(name),
        queries.isMember(req.context.profile.id, name),
      ]);

      res.render("mobile/communities/community", {
        community: { name, members, isMember },
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

      const posts = await queries.getPostWithReplies(
        req.context.profile.id,
        name,
        key
      );

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

  router.get(
    "/mobile/post/:key(*)",
    { desktopVersion: "/post/:key" },
    async (req, res) => {
      const key = "%" + req.params.key;

      const posts = await queries.getPost(req.context.profile.id, key);

      res.render("mobile/post", {
        key,
        posts,
        layout: "mobile/_layout",
      });
    }
  );
};
