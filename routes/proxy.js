const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { Server } = require("./servers");

const router = express.Router();

const servers = [new Server(1, "localhost", 3000, "USA", "active", 1)];

const proxyOptions = {
  target: "",
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader("X-Special-Proxy-Header", "foobar");
  },
  logLevel: "debug",
};

let currIndex = 0;

function getServer() {
  currIndex = (currIndex + 1) % servers.length;
  return servers[currIndex];
}

router.all("*", (req, res, next) => {
  const target = getServer();
  proxyOptions.target = `http://${target.host}:${target.port}`;
  const proxy = createProxyMiddleware(proxyOptions);
  return proxy(req, res, next);
});

module.exports = router;
