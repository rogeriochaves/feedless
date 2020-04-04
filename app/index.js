let server = require("./lib/express");
require("./lib/ssb");
require("./lib/electron");

if (process.env.NODE_ENV !== "production") {
  const chokidar = require("chokidar");
  const watcher = chokidar.watch("./lib");
  const { BrowserWindow } = require("electron");

  watcher.on("ready", () => {
    watcher.on("all", () => {
      console.log("Clearing /lib/ module cache from server");
      Object.keys(require.cache).forEach((id) => {
        if (/[\/\\]lib[\/\\]/.test(id)) delete require.cache[id];
      });
      server.close();
      server = require("./lib/express");
      BrowserWindow.getAllWindows()[0].reload();
    });
  });
}
