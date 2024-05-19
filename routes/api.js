const express = require("express");
const { Video, VideoService } = require("../models/database");

const router = express.Router();

router.get("/videos", async (req, res) => {
  try {
    const videos = await Video.findAll({
      include: VideoService,
    });

    const format = videos.map((video) => ({
      id: video.id,
      title: video.title,
      views: video.views,
      VideoServices: video.VideoServices.map((service) => ({
        id: service.id,
        hostname: service.hostname,
      })),
    }));

    res.json(format);
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    res.status(500).send({ error: "Failed to load list of videos" });
  }
});

module.exports = router;
