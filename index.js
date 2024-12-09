const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 1000;

// Middleware to serve static files (e.g., CSS)
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/scrape", (req, res) => {
    scrapeLogic(res);
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
