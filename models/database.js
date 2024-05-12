const { Sequelize, Model, DataTypes } = require("sequelize");
const { Server } = require("../routes/servers");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
});

class Video extends Model {}
Video.init(
  {
    title: DataTypes.STRING,
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

Video.hasMany(VideoService, { foreignKey: "videoId" });
VideoService.belongsTo(Video, { foreignKey: "videoId" });

function AddVideoServers(servers) {
  for (const server of servers) {
    url = "http://" + server.host + ":" + server.port;
    const [service, created] = VideoService.findOrCreate({
      where: { url: url },
      defaults: { url: url },
    });
    if (created) {
      console.log(`New Video Service Added: ${service.url}`);
      results.push({ url: service.url, status: "created" });
    } else {
      console.log(`Video Service Already Exists: ${service.url}`);
      results.push({ url: service.url, status: "exists" });
    }
  }
  console.log(results);
}

function InitVideoDataFromServers(servers) {
  for (const server of servers) {
    url = "http://" + server.host + ":" + server.port;
  }
}

module.exports = {
  sequelize,
  Video,
  VideoService,
  AddVideoServers,
  InitVideoDataFromServers,
};
