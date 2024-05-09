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
module.exports = { Server };
