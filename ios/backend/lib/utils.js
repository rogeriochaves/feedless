const fs = require("fs");
const pull = require("pull-stream");

const ssbFolder = () => {
  let homeFolder =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return `${(process.argv[2] || homeFolder) + "/.ssb"}`;
};
module.exports.ssbFolder = ssbFolder;

module.exports.writeKey = (key, path) => {
  let secretPath = `${ssbFolder()}${path}`;

  // Same options ssb-keys use
  try {
    fs.mkdirSync(ssbFolder(), { recursive: true });
  } catch (e) {}
  fs.writeFileSync(secretPath, key, { mode: 0x100, flag: "wx" });
};

// From ssb-keys
module.exports.reconstructKeys = (keyfile) => {
  var privateKey = keyfile
    .replace(/\s*\#[^\n]*/g, "")
    .split("\n")
    .filter((x) => x)
    .join("");

  var keys = JSON.parse(privateKey);
  const hasSigil = (x) => /^(@|%|&)/.test(x);

  if (!hasSigil(keys.id)) keys.id = "@" + keys.public;
  return keys;
};

module.exports.promisePull = (...streams) =>
  new Promise((resolve, reject) => {
    pull(
      ...streams,
      pull.collect((err, msgs) => {
        if (err) return reject(err);
        return resolve(msgs);
      })
    );
  });

module.exports.mapValues = (x) => x.map((y) => y.value);
