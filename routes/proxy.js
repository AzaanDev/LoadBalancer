const express = require("express");
const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");
const { Video } = require("../models/database");
const geolib = require("geolib");
const ping = require("ping");

const router = express.Router();
router.use(express.json());
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
  if (!(server in RemapFrabricSites) || !(client in StateCoordinates)) {
    return null;
  } else {
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

  const PingServers = async () => {
    for (const [hostname, server] of Object.entries(servers)) {
      try {
        const res = await ping.promise.probe(server.host);
        servers[hostname].responsetime = res.time;
      } catch (error) {
        console.error(`Error pinging ${hostname}:`, error);
        servers[hostname].responsetime = -1;
        servers[hostname].status = false;
      }
    }
  };

  PingServers();
  const interval = 15 * 1000;
  setInterval(PingServers, interval);

  const GetProxy = async (title, location) => {
    try {
      const video = await Video.findOne({ where: { title: title } });
      const services = await video.getVideoServices();
      const viable_servers = services.map((service) => {
        if (servers[service.hostname].status) return servers[service.hostname];
      });
      viable_servers.sort((a, b) => {
        return (
          GetDistance(a.location, location) - GetDistance(b.location, location)
        );
      });
      return proxies[viable_servers[0].host + ":" + viable_servers[0].port];
    } catch (error) {
      console.error("Error finding server: ", error);
      return null;
    }
  };

  router.post("/video", async (req, res, next) => {
    console.log("Request IP:", req.ip);
    console.log("Body:", req.body);
    const proxy = await GetProxy(req.body.title, req.body.location);
    return proxy(req, res, next);
  });

  return router;
};

module.exports = { InitLoadBalancer };
