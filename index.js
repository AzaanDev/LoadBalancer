const http = require("http");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const proxyRouter = require("./routes/proxy");
const {
  sequelize,
  AddVideoServers,
  InitVideoDataFromServers,
} = require("./models/database");
const apiRoutes = require("./routes/api");
const { LoadServers } = require("./routes/servers");

const app = express();
app.use(bodyParser.json());

app.use(cors());
app.use(express.static("public"));
app.use("/api", apiRoutes);
app.use("/ld", proxyRouter);

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database synced with Sequelize");

    try {
      const servers = LoadServers("./config.json");
      AddVideoServers(servers);
      InitVideoDataFromServers(servers);
    } catch (error) {
      console.error("Failed to sync database:", error);
    }

    const server = http.createServer(app);
    server.listen(8000, () => {
      console.log("HTTP server started on port 80");
    });
  })
  .catch((error) => {
    console.error("Failed to sync database:", error);
  });
