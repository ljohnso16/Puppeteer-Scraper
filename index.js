const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 1000;

app.get("/favicon.ico", (req, res) => {
    console.log("Favicon requested");
    res.status(204).end();
});

// Middleware to serve static files (e.g., CSS)
app.use(express.static("public"));

// Route to serve the HTML file
app.get("/", (req, res) => {
    console.log("Serving index.html");
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

// Debug route for static CSS (optional, ensures correct MIME type)
app.get("/styles.css", (req, res) => {
    console.log("Serving styles.css with correct MIME type");
    res.setHeader("Content-Type", "text/css");
    res.sendFile(path.join(__dirname, "public", "styles.css"));
});


// Route to handle scraping
app.get("/scrape", (req, res) => {
    console.log("Scrape endpoint hit");
    scrapeLogic(res);
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
