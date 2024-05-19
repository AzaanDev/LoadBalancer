const http = require("http");
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models/database");
const { LoadServers } = require("./routes/servers");
const routes = require("./routes/api");
const { InitLoadBalancer } = require("./routes/proxy");

const app = express();

const StartServer = (servers) => {
  app.use("/ld", InitLoadBalancer(servers));
  app.use(cors());
  app.use(express.static("public"));
  app.use(express.json());
  app.use("/api", routes);

  const server = http.createServer(app);
  const PORT = 8000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

const Init = async () => {
  try {
    await sequelize.sync();
    console.log("Database synchronized");
    const servers = await LoadServers("./config.json");
    console.log("Loaded Servers from config");
    StartServer(servers);
  } catch (error) {
    console.error("Error synchronizing database:", error);
  }
};

Init();
