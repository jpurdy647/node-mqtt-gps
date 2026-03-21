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

const pointsDBConnector = require("./db-points-psql");
const TracksProcessor = require("./TracksProcessor");


const pointsDB = new pointsDBConnector();

app.listen(3001, () => {
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
  ], function (req, res) {
  console.log("Received points request with query parameters:", req.query);
  var trackers = [];
  var points = 
  pointsDB.getDistinctTrackers().then((result) => {
    console.log("Distinct trackers from DB:", result.rows);
    trackers = result.rows.map(r => r.tracker_id); // Extract just the tracker_id values
    console.log("Extracted tracker IDs:", trackers);
  }).then(() => {
    if (req.query.hours && req.query.tracker_id) {
      var now = new Date();
      var seconds_end = now.getTime() / 1000;
      var seconds_start = seconds_end - (parseInt(req.query.hours) || 24) * 60 * 60;
      var qp = pointsDB.queryPoints(seconds_start, seconds_end, req.query.tracker_id);
      console.log("qp: ", qp);
      return qp;
    } else if (req.query.seconds_start && req.query.seconds_end && req.query.tracker_id) {
      return pointsDB.queryPoints(req.query.seconds_start, req.query.seconds_end, req.query.tracker_id);
    } else if (req.query.seconds_start && req.query.tracker_id) {
      return pointsDB.queryPoints(req.query.seconds_start, new Date().getTime() / 1000, req.query.tracker_id);
    } else if (req.query.tracker_id) {
      var now = new Date();
      var seconds_end = now.getTime() / 1000;
      var seconds_start = seconds_end - (24 * 60 * 60);
      return pointsDB.queryPoints(seconds_start, seconds_end, req.query.tracker_id);
    } else {
      //return PromiseRejectionEvent("No valid query parameters provided. Please provide either 'tracker_id' with optional 'hours', or 'tracker_id' with 'seconds_start' and optionally 'seconds_end'.");
    }
  })
  .then((result) => {
    if (result){
      console.log("Raw points from DB:", result);
      const processedPoints = TracksProcessor.processPath(result);
      console.log("Processed points for map:", processedPoints);
      res.json({ points: processedPoints, tracker_ids: trackers });
    } else {
      //TODO
      console.warn("No points found for the given query parameters.");
      console.warn("Result:", result);
      res.json({ points: [], tracker_ids: trackers });
    }
  }).catch((err) => {
    res.status(500).send(err.stack);
  });
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
  pointsDB.getDistinctTrackers().then((result) => {
    res.json(result.map(r => r.value)); // Extract just the tracker_id values
  }).catch((err) => {
    res.status(500).send(err.stack);
  });
});

/**
 * Now, we'll make sure the database exists and boot the app.
 */

