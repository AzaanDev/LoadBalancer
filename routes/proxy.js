const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { LoadServers } = require("../routes/servers");

const router = express.Router();

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

router.all("*", (req, res, next) => {
  const proxy = getNextProxy();
  return proxy(req, res, next);
});

module.exports = router;
