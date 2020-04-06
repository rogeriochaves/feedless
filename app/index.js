let server;
require("./lib/ssb");

setTimeout(() => {
  server = require("./lib/express");
}, 500);

setTimeout(() => {
  require("./lib/electron");
}, 1000);

if (process.env.NODE_ENV !== "production") {
  const chokidar = require("chokidar");
  const watcher = chokidar.watch("./lib");

  watcher.on("ready", () => {
    watcher.on("all", () => {
      console.log("Clearing /lib/ module cache from server");
      Object.keys(require.cache).forEach((id) => {
        if (/[\/\\]lib[\/\\]/.test(id)) delete require.cache[id];
      });
      if (server) server.close();
      server = require("./lib/express");
    });
  });
}
