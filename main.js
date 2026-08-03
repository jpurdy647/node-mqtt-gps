/**
 * In this example we'll create a server which has an index page that prints
 * out "hello world", and a page `http://localhost:3000/times` which prints
 * out the last ten response times that InfluxDB gave us.
 *
 * Get started by importing everything we need!
 */
const express = require("express");
const { check, query } = require('express-validator');

const http = require("http");
const os = require("os");
const path = require('path')


const app = express();
app.set('view engine', 'ejs'); // Sets EJS as the template engine
app.set('views', __dirname + '/views'); // Sets the views directory
app.use(express.static('assets')); // Serves static files from the 'assets' directory
app.use(express.json());

const pointsDBConnector = require("./db-points-psql");
const TracksProcessor = require("./TracksProcessor");
const mqttManualUpdates = require("./mqtt");


const pointsDB = new pointsDBConnector();

app.listen(3000, () => {
  console.log(`App listening on port 3001`)
})

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`Request to ${req.path} took ${duration}ms`);
  });
  return next();
});

app.get("/", function (req, res) {
  res.render("map-view");
});

app.get("/map", function (req, res) {
  res.render("map-view");
});

app.get("/points",[
    check('tracker_id', 'seconds_start', 'seconds_end', 'hours').trim().escape() // Sanitizes and escapes the 'searchQuery' parameter
  ], async function (req, res) {
  console.log("Received points request with query parameters:", req.query);

  try {
    const selectedTrackerId = req.query.tracker_id;
    let trackerIds = [];

    if (selectedTrackerId && selectedTrackerId !== "all_trackers") {
      trackerIds = [selectedTrackerId];
    } else {
      trackerIds = await pointsDB.getDistinctTrackers();
    }

    let seconds_start;
    let seconds_end;

    if (req.query.hours && selectedTrackerId) {
      const now = new Date();
      seconds_end = now.getTime() / 1000;
      seconds_start = seconds_end - (parseInt(req.query.hours) || 24) * 60 * 60;
    } else if (req.query.seconds_start && req.query.seconds_end && selectedTrackerId) {
      seconds_start = req.query.seconds_start;
      seconds_end = req.query.seconds_end;
    } else if (req.query.seconds_start && selectedTrackerId) {
      seconds_start = req.query.seconds_start;
      seconds_end = new Date().getTime() / 1000;
    } else if (selectedTrackerId) {
      const now = new Date();
      seconds_end = now.getTime() / 1000;
      seconds_start = seconds_end - (24 * 60 * 60);
    } else {
      const now = new Date();
      seconds_end = now.getTime() / 1000;
      seconds_start = seconds_end - (24 * 60 * 60);
    }

    const result = await pointsDB.queryPoints(seconds_start, seconds_end, trackerIds);
    const processedPoints = TracksProcessor.processPath(result);
    res.json({ trackers: processedPoints, tracker_ids: trackerIds });
  } catch (err) {
    console.error("Error processing points request:", err);
    res.status(500).send(err.stack);
  }
});


app.get("/times", [
    check('tracker_id').trim().escape() // Sanitizes and escapes the 'searchQuery' parameter
  ], function (req, res) {
  pointsDB.queryPointsPromise(24, req.query.tracker_id).then((result) => {
    res.json(result);
  }).catch((err) => {
    res.status(500).send(err.stack);
  });
});

app.get("/trackers", function (req, res) {
  console.log("Received request for distinct trackers");
  pointsDB.getDistinctTrackers().then((trackers) => {
    console.log("Trackers from DB:", trackers);
    res.json(trackers);
  }).catch((err) => {
    console.error("Error fetching trackers:", err);
    res.status(500).json({ error: "Failed to fetch trackers" });
  });
});

function handleManualUpdatesWatch(clientId, intervalSeconds, res) {
  try {
    const status = mqttManualUpdates.registerManualUpdateWatcher(clientId, intervalSeconds);
    res.json({ ok: true, status });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

app.post("/api/mqtt/manual-updates/watch", function (req, res) {
  const { clientId, intervalSeconds } = req.body || {};
  handleManualUpdatesWatch(clientId, intervalSeconds, res);
});

app.get("/api/mqtt/manual-updates/watch", function (req, res) {
  const clientId = req.query.clientId;
  const intervalSeconds = req.query.intervalSeconds;
  handleManualUpdatesWatch(clientId, intervalSeconds, res);
});

function handleManualUpdatesKeepAlive(clientId, res) {
  const active = mqttManualUpdates.keepAliveManualUpdateWatcher(clientId);
  res.json({ ok: true, active, status: mqttManualUpdates.getManualUpdateStatus() });
}

app.post("/api/mqtt/manual-updates/keepalive", function (req, res) {
  const { clientId } = req.body || {};
  handleManualUpdatesKeepAlive(clientId, res);
});

app.get("/api/mqtt/manual-updates/keepalive", function (req, res) {
  const clientId = req.query.clientId;
  handleManualUpdatesKeepAlive(clientId, res);
});

function handleManualUpdatesUnwatch(clientId, res) {
  const removed = mqttManualUpdates.unregisterManualUpdateWatcher(clientId);
  res.json({ ok: true, removed, status: mqttManualUpdates.getManualUpdateStatus() });
}

app.post("/api/mqtt/manual-updates/unwatch", function (req, res) {
  const { clientId } = req.body || {};
  handleManualUpdatesUnwatch(clientId, res);
});

app.get("/api/mqtt/manual-updates/unwatch", function (req, res) {
  const clientId = req.query.clientId;
  handleManualUpdatesUnwatch(clientId, res);
});

app.get("/api/mqtt/manual-updates/status", function (req, res) {
  res.json({ ok: true, status: mqttManualUpdates.getManualUpdateStatus() });
});