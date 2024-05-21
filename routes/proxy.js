const express = require("express");
const { v4: uuidv4 } = require("uuid");
const cookieParser = require("cookie-parser");
const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");
const { Video, IncrementViewCount } = require("../models/database");
const { ReplicaVideoToAll } = require("./servers");
const geolib = require("geolib");
const ping = require("ping");

const router = express.Router();
router.use(express.json());
router.use(cookieParser());

const geolocationWeight = 0.4;
const latencyWeight = 0.2;
const activeConnectionsWeight = 0.3;

// https://gist.github.com/meiqimichelle/7727723
const StateCoordinates = {
  AK: { lat: 61.385, lon: -152.2683 },
  AL: { lat: 32.799, lon: -86.8073 },
  AR: { lat: 34.9513, lon: -92.3809 },
  AZ: { lat: 33.7712, lon: -111.3877 },
  CA: { lat: 36.17, lon: -119.7462 },
  CO: { lat: 39.0646, lon: -105.3272 },
  CT: { lat: 41.5834, lon: -72.7622 },
  DE: { lat: 39.3498, lon: -75.5148 },
  FL: { lat: 27.8333, lon: -81.717 },
  GA: { lat: 32.9866, lon: -83.6487 },
  HI: { lat: 21.1098, lon: -157.5311 },
  IA: { lat: 42.0046, lon: -93.214 },
  ID: { lat: 44.2394, lon: -114.5103 },
  IL: { lat: 40.3363, lon: -89.0022 },
  IN: { lat: 39.8647, lon: -86.2604 },
  KS: { lat: 38.5111, lon: -96.8005 },
  KY: { lat: 37.669, lon: -84.6514 },
  LA: { lat: 31.1801, lon: -91.8749 },
  MA: { lat: 42.2373, lon: -71.5314 },
  MD: { lat: 39.0724, lon: -76.7902 },
  ME: { lat: 44.6074, lon: -69.3977 },
  MI: { lat: 43.3504, lon: -84.5603 },
  MN: { lat: 45.7326, lon: -93.9196 },
  MO: { lat: 38.4623, lon: -92.302 },
  MS: { lat: 32.7673, lon: -89.6812 },
  MT: { lat: 46.9048, lon: -110.3261 },
  NC: { lat: 35.6411, lon: -79.8431 },
  ND: { lat: 47.5362, lon: -99.793 },
  NE: { lat: 41.1289, lon: -98.2883 },
  NH: { lat: 43.4108, lon: -71.5653 },
  NJ: { lat: 40.314, lon: -74.5089 },
  NM: { lat: 34.8375, lon: -106.2371 },
  NV: { lat: 38.4199, lon: -117.1219 },
  NY: { lat: 42.1497, lon: -74.9384 },
  OH: { lat: 40.3736, lon: -82.7755 },
  OK: { lat: 35.5376, lon: -96.9247 },
  OR: { lat: 44.5672, lon: -122.1269 },
  PA: { lat: 40.5773, lon: -77.264 },
  RI: { lat: 41.6772, lon: -71.5101 },
  SC: { lat: 33.8191, lon: -80.9066 },
  SD: { lat: 44.2853, lon: -99.4632 },
  TN: { lat: 35.7449, lon: -86.7489 },
  TX: { lat: 31.106, lon: -97.6475 },
  UT: { lat: 40.1135, lon: -111.8535 },
  VA: { lat: 37.768, lon: -78.2057 },
  VT: { lat: 44.0407, lon: -72.7093 },
  WA: { lat: 47.3917, lon: -121.5708 },
  WI: { lat: 44.2563, lon: -89.6385 },
  WV: { lat: 38.468, lon: -80.9696 },
  WY: { lat: 42.7475, lon: -107.2085 },
};

const RemapFrabricSites = {
  NEWY: StateCoordinates.NY,
  WASH: { lat: 38.9072, lon: -77.009056 },
  KANS: StateCoordinates.KS,
  SEAT: StateCoordinates.WA,
  LOSA: StateCoordinates.LA,
  DALL: StateCoordinates.TX,
  ATLA: StateCoordinates.GA,
  FIU: StateCoordinates.FL,
};

const GetDistance = (server, client) => {
  if (server in RemapFrabricSites && client in StateCoordinates) {
    const d = geolib.getDistance(
      {
        latitude: StateCoordinates[client].lat,
        longitude: StateCoordinates[client].lon,
      },
      {
        latitude: RemapFrabricSites[server].lat,
        longitude: RemapFrabricSites[server].lon,
      }
    );
    return d;
  }
};

let Sessions = {};

const CreateSession = (sessionID, server) => {
  if (Sessions[sessionID]) {
    Sessions[sessionID].server = server;
    Sessions[sessionID].time = Date.now();
  } else {
    Sessions[sessionID] = {
      server: server,
      time: Date.now(),
    };
  }
  Sessions[sessionID].server.connections += 1;
};

const CheckSessionTimeouts = () => {
  let timeout = 5 * 60 * 1000; // 5 minute timeout
  let currentime = Date.now();

  Object.keys(Sessions).forEach((sessionID) => {
    let session = Sessions[sessionID];
    let elapsedTime = currentime - session.time;
    if (elapsedTime > timeout) {
      Sessions[sessionID].server.connections -= 1;
      delete Sessions[sessionID];
    }
  });
};

const getMaxActiveConnections = (servers) => {
  return Math.max(...servers.map((server) => server.connections));
};

const InitLoadBalancer = (servers) => {
  const proxies = {};
  for (const hostname in servers) {
    console.log(`${hostname}, ${servers[hostname].id}`);
    proxies[hostname] = createProxyMiddleware({
      target: `http://${hostname}`,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
    });
  }

  const ServerLatencies = {};

  const getMaxLatencyAndChange = (servers) => {
    return Math.max(
      ...servers.map(
        (server) =>
          ServerLatencies[server.host + ":" + server.port].averageLatency
      )
    );
  };

  const PingServers = async () => {
    for (const [hostname, server] of Object.entries(servers)) {
      if (!ServerLatencies[hostname]) {
        ServerLatencies[hostname] = {
          totalLatency: 0,
          numPings: 0,
          latencyChange: 0,
          averageLatency: 0,
        };
      }
      try {
        const res = await ping.promise.probe(server.host);
        servers[hostname].responsetime = res.time;
        ServerLatencies[hostname].totalLatency += res.time;
        ServerLatencies[hostname].numPings++;
      } catch (error) {
        console.error(`Error pinging ${hostname}:`, error);
        servers[hostname].responsetime = -1;
        servers[hostname].status = false;
      }
    }

    for (const [hostname, latencyData] of Object.entries(ServerLatencies)) {
      const averageLatency = latencyData.totalLatency / latencyData.numPings;
      const previousAverageLatency = ServerLatencies[hostname].averageLatency;

      if (previousAverageLatency === 0)
        ServerLatencies[hostname].latencyChange = 0;
      else
        ServerLatencies[hostname].latencyChange =
          averageLatency - previousAverageLatency;
      ServerLatencies[hostname].averageLatency = averageLatency;
      ServerLatencies[hostname].totalLatency = 0;
      ServerLatencies[hostname].numPings = 0;
    }
  };

  PingServers();
  const interval = 15 * 1000;
  setInterval(PingServers, interval);
  setInterval(CheckSessionTimeouts, 60 * 1000);

  const GetProxy = async (title, location, sessionID) => {
    try {
      if (Sessions[sessionID]) Sessions[sessionID].server.connections -= 1;

      // Get Video and all Servers with that Video
      const video = await Video.findOne({ where: { title: title } });
      const services = await video.getVideoServices();

      // Check if video is a good candidate for replication
      if (
        services.length !== Object.keys(servers).length &&
        video.views > 1000
      ) {
        const ServersToReplicate = Object.entries(servers)
          .filter(
            ([hostname, server]) =>
              !services.some((service) => service.hostname === hostname)
          )
          .map(([_, server]) => server);
        await ReplicaVideoToAll(
          ServersToReplicate,
          services[0].hostname,
          title
        );
      }

      const viable_servers = services.map((service) => {
        if (servers[service.hostname].status) return servers[service.hostname];
      });

      if (location in StateCoordinates) {
        viable_servers.sort((a, b) => {
          return (
            GetDistance(a.location, location) -
            GetDistance(b.location, location)
          );
        });
      }

      const max_connections = getMaxActiveConnections(viable_servers);
      const max_avg_latency = getMaxLatencyAndChange(viable_servers);
      const scores = viable_servers.map((server, index) => {
        const hostname = server.host + ":" + server.port;
        let geolocationScore = 0;
        if (location in StateCoordinates) {
          geolocationScore = 1 - index / viable_servers.length;
        } else geolocationScore = 1;
        const latencyScore =
          1 -
          (ServerLatencies[hostname].averageLatency +
            ServerLatencies[hostname].latencyChange) /
            max_avg_latency;
        const activeConnectionsScore =
          max_connections !== 0 ? 1 - server.connections / max_connections : 0;

        const score =
          geolocationScore * geolocationWeight +
          latencyScore * latencyWeight +
          activeConnectionsScore * activeConnectionsWeight;

        return { server, score };
      });

      scores.sort((a, b) => b.score - a.score);
      await IncrementViewCount(video.id);
      selected = scores[0].server;
      // console.log(scores);
      CreateSession(sessionID, selected);
      return proxies[selected.host + ":" + selected.port];
    } catch (error) {
      console.error("Error finding server: ", error);
      return null;
    }
  };

  router.post("/video", async (req, res, next) => {
    // console.log("Request IP:", req.ip);
    // console.log("Body:", req.body);
    let sessionID = req.cookies["sessionID"];
    if (!sessionID) {
      sessionID = uuidv4();
      res.cookie("sessionID", sessionID, { httpOnly: true });
    }
    const proxy = await GetProxy(req.body.title, req.body.location, sessionID);
    res.cookie("sessionID", sessionID, { httpOnly: true });
    return proxy(req, res, next);
  });

  // Since User gets redirected to VideoService and stop communicating with load balancer, have user ping the load balancer
  router.get("/ping", (req, res) => {
    const sessionID = req.cookies.sessionID;
    if (!sessionID) {
      return res.status(400).json({ error: "SessionID is required." });
    }

    Sessions[sessionID].time = Date.now();
    return res.status(200).json({ message: "Ping received." });
  });

  return router;
};

module.exports = { InitLoadBalancer };
