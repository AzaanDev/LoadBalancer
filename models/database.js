const { Sequelize, Model, DataTypes } = require("sequelize");
const axios = require("axios");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
});

class Video extends Model {}
Video.init(
  {
    title: {
      type: DataTypes.STRING,
      unique: true,
    },
    views: DataTypes.INTEGER,
  },
  { sequelize, modelName: "video" }
);

class VideoService extends Model {}
VideoService.init(
  {
    url: {
      type: DataTypes.STRING,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "VideoService",
    timestamps: false,
  }
);

Video.belongsToMany(VideoService, { through: "VideoVideoService" });
VideoService.belongsToMany(Video, { through: "VideoVideoService" });

function AddVideoServers(servers) {
  for (const server of servers) {
    console.log(server);
    url = "http://" + server.host + ":" + server.port;
    VideoService.findOrCreate({
      where: { url: url },
      defaults: { url: url },
    })
      .then(([service, created]) => {
        if (created) {
          console.log(`New Video Service Added: ${service.url}`);
        } else {
          console.log(`Video Service Already Exists: ${service.url}`);
        }
      })
      .catch((error) => {
        console.error("Error adding video service:", error);
      });
  }
}

function InitVideoDataFromServers(servers) {
  for (const server of servers) {
    const url = `http://${server.host}:${server.port}`;

    axios
      .get(url + "/videos")
      .then(async (response) => {
        console.log(url);
        console.log("VIDEOS", response.data);

        const videoService = await VideoService.findOne({ where: { url } });
        if (!videoService) {
          console.error(`Video Service not found for URL: ${url}`);
          return;
        }

        const titles = response.data.titles;
        for (const title of titles) {
          try {
            const [video, created] = await Video.findOrCreate({
              where: { title },
              defaults: { title, views: 0, videoId: videoService.id },
            });
            video.addVideoService(videoService);
            if (created) {
              console.log(`New Video Added: ${video.title}`);
            } else {
              console.log(`Video Already Exists: ${video.title}`);
            }
          } catch (error) {
            console.error(`Error adding video "${title}":`, error);
          }
        }
      })
      .catch((error) => {
        if (error.code === "ECONNREFUSED") {
          console.error(`Connection refused to ${url}: ${error.message}`);
        } else {
          console.error(`Failed to fetch video data from ${url}:`, error);
        }
      });
  }
}

module.exports = {
  sequelize,
  Video,
  VideoService,
  AddVideoServers,
  InitVideoDataFromServers,
};
