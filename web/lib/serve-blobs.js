const pull = require("pull-stream");
const cat = require("pull-cat");
const toPull = require("stream-to-pull-stream");
const ident = require("pull-identify-filetype");
const mime = require("mime-types");
const URL = require("url");
const debug = require("debug")("server-blobs");

const serveBlobs = (sbot) => {
  return (req, res) => {
    const parsed = URL.parse(req.url, true);
    const hash = decodeURIComponent(parsed.pathname.replace("/blob/", ""));
    debug("fetching", hash);

    waitFor(hash, function (_, has) {
      if (!has) return respond(res, 404, "File not found");
      // optional name override
      if (parsed.query.name) {
        res.setHeader(
          "Content-Disposition",
          "inline; filename=" + encodeURIComponent(parsed.query.name)
        );
      }

      // serve
      const ONE_YEAR = 60 * 60 * 24 * 365;
      res.setHeader("Cache-Control", `public, max-age=${ONE_YEAR}`);
      res.setHeader("Content-Security-Policy", BlobCSP());

      respondSource(res, sbot.blobs.get(hash), false);
    });
  };

  function waitFor(hash, cb) {
    let finished = false;
    let wrappedCb = (err, result) => {
      if (finished) return;
      finished = true;
      cb(err, result);
    };

    setTimeout(() => {
      debug("timeout for", hash);
      wrappedCb(null, false);
    }, 5000);

    sbot.blobs.has(hash, function (err, has) {
      if (err) return wrappedCb(err);
      debug("has is ", has, "for", hash);
      if (has) {
        wrappedCb(null, has);
      } else {
        debug("calling want for", hash);
        sbot.blobs.want(hash, wrappedCb);
      }
    });
  }

  function respondSource(res, source, wrap) {
    if (wrap) {
      res.writeHead(200, { "Content-Type": "text/html" });
      pull(
        cat([
          pull.once("<html><body><script>"),
          source,
          pull.once("</script></body></html>"),
        ]),
        toPull.sink(res)
      );
    } else {
      pull(
        source,
        ident(function (type) {
          if (type) res.writeHead(200, { "Content-Type": mime.lookup(type) });
        }),
        toPull.sink(res)
      );
    }
  }

  function respond(res, status, message) {
    res.writeHead(status);
    res.end(message);
  }

  function BlobCSP() {
    return "default-src none; sandbox";
  }
};

module.exports = serveBlobs;
