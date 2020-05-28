console.log("Loading nodejs");

process.on("unhandledRejection", (reason, _promise) => {
  console.error("unhandledRejection", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
});

require("./lib/ssb");

setTimeout(() => {
  require("./lib/express");
}, 1000);
