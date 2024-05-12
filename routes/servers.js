const fs = require("node:fs");

class Server {
  constructor(id, host, port, location, status, weight) {
    this.id = id;
    this.host = host;
    this.port = port;
    this.connections = 0;
    this.location = location;
    this.status = status;
    this.weight = weight;
  }
}

function LoadServers(filename) {
  try {
    const data = fs.readFileSync(filename, "utf8");
    const jsonData = JSON.parse(data);
    const servers = jsonData.servers.map(
      (server, index) =>
        new Server(
          index,
          server.host,
          server.port,
          server.location,
          server.status,
          server.weight
        )
    );
    return servers;
  } catch (err) {
    console.error("Failed to load servers:", err);
    throw err;
  }
}

module.exports = { Server, LoadServers };
