const express = require("express");
const path = require("path");

const app = express();
const PORT = 5500;

// Serve website root from /public_html
app.use("/", express.static(path.join(__dirname, "public_html")));

// Serve /Docs from sibling folder
app.use("/Docs", express.static(path.join(__dirname, "Docs")));
app.use("/docs", express.static(path.join(__dirname, "Docs"))); // optional alias

app.listen(PORT, () => {
  console.log(`Dev server running: http://127.0.0.1:${PORT}/`);
});