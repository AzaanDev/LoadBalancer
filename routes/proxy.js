const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { LoadServers } = require("../routes/servers");
const bodyParser = require("body-parser");

const router = express.Router();
//router.use(bodyParser.text({ type: "text/plain" }));

const servers = LoadServers("./config.json");

console.log(servers);

const proxies = servers.map((server) => {
  return createProxyMiddleware({
    target: `http://${server.host}:${server.port}`,
    changeOrigin: true,
  });
});

let currIndex = 0;

function getNextProxy() {
  const proxy = proxies[currIndex];
  currIndex = (currIndex + 1) % proxies.length;
  return proxy;
}

router.all("/video", (req, res, next) => {
  console.log("Request IP:", req.ip);
  console.log("Port:", req.socket.localPort);
  console.log("Title:", req.query.title);
  const proxy = getNextProxy();
  return proxy(req, res, next);
});

router.all("/videos", (req, res, next) => {
  const proxy = getNextProxy();
  return proxy(req, res, next);
});

module.exports = router;
