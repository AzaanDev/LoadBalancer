const express = require("express");
const { Video } = require("../models/database");

const router = express.Router();

router.get("/videos", async (req, res) => {
  try {
    const videos = await Video.findAll();
    res.json(videos);
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    res.status(500).send({ error: "Failed to load videos" });
  }
});

module.exports = router;
