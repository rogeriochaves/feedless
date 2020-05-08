console.log("Loading nodejs");

const fs = require("fs");
// const path = `./node_modules/sodium-native-nodejs-mobile`;
const path = `${process.argv[3]}/backend/node_modules/sodium-native-nodejs-mobile/build/Release`;
console.log("file list on", path);
fs.readdirSync(path).forEach((file) => {
  console.log(file);
});

process.on("unhandledRejection", (reason, _promise) => {
  console.error("unhandledRejection", reason);
  setTimeout(() => {
    process.exit(1);
  });
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
  setTimeout(() => {
    process.exit(1);
  });
});

require("./lib/ssb");

require("./lib/express");
