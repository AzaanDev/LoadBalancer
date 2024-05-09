const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send(`Hello`);
});

app.get("/app", (req, res) => {
  res.send(`Hello from server! Host: 3000`);
});

app.listen(3000, () => {
  console.log("Backend server running on port 3000");
});
