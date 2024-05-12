const http = require("http");
const express = require("express");
const cors = require("cors");
const proxyRouter = require("./routes/proxy");
const { sequelize, AddVideoServers } = require("./models/database");
const apiRoutes = require("./routes/api");
const { LoadServers } = require("./routes/servers");

const servers = LoadServers("./config.json");
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use("/api", apiRoutes);
app.use("/ld", proxyRouter);

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database synced with Sequelize");

    // AddVideoServers(servers);

    const server = http.createServer(app);
    server.listen(80, () => {
      console.log("HTTP server started on port 80");
    });
  })
  .catch((error) => {
    console.error("Failed to sync database:", error);
  });
