const { Sequelize, Model, DataTypes } = require("sequelize");
const { Mutex } = require("async-mutex");
const axios = require("axios");

const mutex = new Mutex();

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
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
    hostname: {
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

Video.belongsToMany(VideoService, { through: "Video-VideoService" });
VideoService.belongsToMany(Video, { through: "Video-VideoService" });

const AddVideoService = async (hostname) => {
  const release = await mutex.acquire();
  try {
    const [service, created] = await VideoService.findOrCreate({
      where: { hostname },
    });
    if (created)
      console.log("VideoService added with id:", service.id, service.hostname);
    else
      console.log("VideoService already exists:", service.id, service.hostname);
  } catch (error) {
    console.error("Error adding VideoService:", hostname);
    throw error;
  } finally {
    release();
  }
};

const AddVideoToServer = async (title, hostname) => {
  const release = await mutex.acquire();
  try {
    const [video, created] = await Video.findOrCreate({
      where: { title },
      defaults: { views: 0 },
    });

    const video_service = await VideoService.findOne({ where: { hostname } });
    video.addVideoService(video_service);

    if (created) console.log("Video added with id:", video.id, video.title);
    else console.log("Video add to server:", video.id, video_service.hostname);
  } catch (error) {
    console.error("Error adding video:", hostname);
    throw error;
  } finally {
    release();
  }
};

const AddVideo = async (title, video_service_id) => {
  const release = await mutex.acquire();
  try {
    const [video, created] = await Video.findOrCreate({
      where: { title },
      defaults: { views: 0 },
    });

    const video_service = await VideoService.findByPk(video_service_id);
    video.addVideoService(video_service);

    if (created) console.log("Video added with id:", video.id, video.title);
    else console.log("Video already exists:", video.id, video.title);
  } catch (error) {
    console.error("Error adding video:", hostname);
    throw error;
  } finally {
    release();
  }
};

const IncrementViewCount = async (videoId) => {
  const video = await Video.findByPk(videoId);
  if (!video) {
    throw new Error(`Video with id ${videoId} not found`);
  }

  const release = await mutex.acquire();

  try {
    await video.increment("views", { by: 1 });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    throw error;
  } finally {
    release();
  }
};

module.exports = {
  sequelize,
  Video,
  VideoService,
  AddVideo,
  AddVideoService,
  AddVideoToServer,
  IncrementViewCount,
};
