console.log("Loading nodejs");

process.on("unhandledRejection", (reason, _promise) => {
  console.log("unhandledRejection", reason);
});
process.on("uncaughtException", (err) => {
  console.log("uncaughtException", err);
});

const targetEnvironment = process.argv[4];
if (targetEnvironment == "iphoneos") {
  require("../" + "override-dlopen-paths-preload"); // to go around noderify, as it overrides __dirname
}

require("./lib/ssb");

setTimeout(() => {
  require("./lib/express");
}, 1000);
