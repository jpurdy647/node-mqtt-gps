# node-mqtt-web

Web map viewer and backend for GPS tracker data with MQTT-triggered manual updates.

## What this project does

- Serves an interactive map UI for tracker history and stop/travel segmentation.
- Reads tracker points from PostgreSQL (`gps_points` table).
- Subscribes to `owntracks/#` over MQTT and writes incoming points to InfluxDB.
- Supports manual MQTT refresh commands on an interval requested by active web clients.
- Includes stop detection controls (radius, minimum stop time, exit tolerance, sampling).

## Project structure

- `main.js` - Express server, map routes, points APIs, manual-update APIs.
- `mqtt.js` - MQTT subscriber + Influx writer + manual command scheduler.
- `db-points-psql.js` - PostgreSQL query layer used by the map API.
- `TracksProcessor.js` - Track processing before rendering.
- `views/map-view.ejs` - Main map UI.
- `assets/` - Static web assets.

## Requirements

- Node.js 18+ (recommended)
- npm
- Reachable services:
  - MQTT broker
  - PostgreSQL
  - InfluxDB

## Install

```bash
npm install
```

## Run

> Note: `package.json` currently points `start` to `main.ts`, but this project runs from `main.js`.

Run directly:

```bash
node main.js
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/map`

## Configuration notes

This codebase currently uses hardcoded connection values in source files:

- MQTT broker/user/pass in `mqtt.js`
- Influx host/db in `mqtt.js` and `db-points-influx.js`
- PostgreSQL host/db/user/pass in `db-points-psql.js`

For production use, move these to environment variables.

## Main HTTP endpoints

### Map and data

- `GET /` - map UI
- `GET /map` - map UI
- `GET /trackers` - list tracker IDs
- `GET /points` - points for selected tracker(s) and time range
- `GET /times` - legacy query route

`/points` query params:

- `tracker_id` (`all_trackers` supported)
- `seconds_start`
- `seconds_end`
- `hours`

### Manual MQTT update control

- `POST /api/mqtt/manual-updates/watch`
  - body: `{ "clientId": "viewer-123", "intervalSeconds": 15 }`
- `POST /api/mqtt/manual-updates/keepalive`
  - body: `{ "clientId": "viewer-123" }`
- `POST /api/mqtt/manual-updates/unwatch`
  - body: `{ "clientId": "viewer-123" }`
- `GET /api/mqtt/manual-updates/status`

Behavior:

- If multiple clients request different intervals, the fastest (smallest) interval is used.
- Clients must send keepalive at least every 30s, or they are removed.
- When no active watchers remain, periodic manual commands stop.

## Manual MQTT commands sent by scheduler

Current command set in `mqtt.js`:

- `owntracks/alana/alanaphone/cmd` payload `{"_type":"cmd","action":"reportLocation"}`
- `owntracks/josh/JPGraphene/cmd` payload `{"_type":"cmd","action":"reportLocation"}`
- `owntracks/lane/NLPGraphene/cmd` payload `{"_type":"cmd","action":"reportLocation"}`
- `owntracks/lisa/llp/cmd` payload `{"_type":"cmd","action":"reportLocation"}`

## UI highlights

- Tracker filter and date-range controls
- Stop/travel segmentation
- Segment drawer with:
  - Travel/Stops/Both jump mode
  - previous/next segment arrows
  - per-segment point count
- Stop radius circles and stop-point highlighting
- Live SVG tracker markers with 2-char IDs

## Troubleshooting

- If map loads but no tracks appear:
  - Confirm PostgreSQL is reachable and `gps_points` has data.
  - Check server logs for query errors.
- If manual updates do not fire:
  - Check `/api/mqtt/manual-updates/status` for active watchers.
  - Confirm keepalives are being sent.
  - Confirm MQTT broker credentials and connectivity.
- If points are delayed or sparse:
  - Adjust sampling interval and stop detection settings in the UI.

## License

MIT
