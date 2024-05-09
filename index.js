const http = require("http");
const express = require("express");
const proxyRouter = require("./routes/proxy");

const app = express();

app.use("/", proxyRouter);
app.use("/app", proxyRouter);

const server = http.createServer(app);

server.listen(80, () => {
  console.log("HTTP server started on port 80");
});
