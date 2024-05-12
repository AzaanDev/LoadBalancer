const { Video } = require("../models/database");

async function createVideo() {
  try {
    const newVideo = await Video.create({
      title: "TestVideo",
      timestamp: new Date(),
      views: 0,
    });
    console.log("New Video's ID:", newVideo.id);
  } catch (error) {
    console.error("Error creating video:", error);
  }
}

async function fetchVideos() {
  try {
    const videos = await Video.findAll();
    console.log("All videos:", videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
  }
}

module.exports = {
  createVideo,
  fetchVideos,
};
