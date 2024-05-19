const fs = require("fs").promises;
const axios = require("axios");

const { AddVideo, AddVideoService } = require("../models/database");

class Server {
  constructor(id, host, port, location, status, weight) {
    this.id = id;
    this.host = host;
    this.port = port;
    this.connections = 0;
    this.location = location;
    this.status = status;
    this.weight = weight;
    this.responsetime = -1;
  }
}

const LoadVideosFromServer = async (hostname, id) => {
  try {
    const response = await axios.get("http://" + hostname + "/videos");
    const titles = response.data.titles;
    for (const title of titles) {
      await AddVideo(title, id);
    }
  } catch (error) {
    console.error(error);
  }
};

const LoadServers = async (filename) => {
  try {
    const data = await fs.readFile(filename, "utf8");
    const json = JSON.parse(data);
    const servers = {};

    json.servers.forEach(async (server, index) => {
      const key = `${server.host}:${server.port}`;
      servers[key] = new Server(
        index + 1,
        server.host,
        server.port,
        server.location,
        server.status,
        server.weight
      );
      server.id = index + 1;
      const hostname = server.host + ":" + server.port;
      await AddVideoService(hostname);
      await LoadVideosFromServer(hostname, server.id);
    });
    return servers;
  } catch (err) {
    console.error("Failed to load servers:", err);
    throw err;
  }
};

module.exports = { Server, LoadServers };
