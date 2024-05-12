const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`Hello`);
});

app.get("/app", (req, res) => {
  res.send(`Hello from server! Host: 8081`);
});

app.post("/data", (req, res) => {
  const { name, age } = req.body;
  res.status(201).send(`Received data: Name - ${name}, Age - ${age}`);
});

app.listen(8081, () => {
  console.log("Backend server running on port 8081");
});
