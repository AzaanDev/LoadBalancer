const fs = require("fs").promises;
const axios = require("axios");

const {
  AddVideo,
  AddVideoService,
  AddVideoToServer,
} = require("../models/database");

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

const DownloadReplica = async (hostname, url) => {
  try {
    const response = await axios.post(`http://${hostname}/download`, { url });
    return response.data.url;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const GetVideoFromServer = async (hostname, title) => {
  try {
    const response = await axios.post(`http://${hostname}/video`, { title });
    return response.data.url;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const LoadVideosFromServer = async (hostname, id) => {
  try {
    const response = await axios.get(`http://${hostname}/videos`);
    const titles = response.data.titles;
    if (titles) {
      for (const title of titles) {
        await AddVideo(title, id);
      }
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

const ReplicaVideoToAll = async (servers, video_server, title) => {
  try {
    const url = await GetVideoFromServer(video_server, title);
    for (const server of servers) {
      const hostname = server.host + ":" + server.port;
      await DownloadReplica(hostname, url);
      await AddVideoToServer(title, hostname);
    }
  } catch (err) {
    console.error("Failed to replica video:", err);
    throw err;
  }
};

module.exports = { Server, LoadServers, ReplicaVideoToAll };
