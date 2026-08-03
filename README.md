# node-mqtt-web

Web map viewer and backend for GPS tracker data, with MQTT-triggered location refresh support for OwnTracks devices.

## What this project does

- Serves an interactive map UI for tracker history and stop/travel segmentation.
- Reads tracker points from PostgreSQL (`gps_points` table).
- Subscribes to `owntracks/#` over MQTT and writes incoming points to PostgreSQL.
- Supports client-driven manual MQTT refresh commands at selectable intervals.
- Detects and visualizes stop segments with configurable thresholds.
- Renders live SVG tracker markers with 2-character tracker IDs.

## Project structure

- `main.js` - Express server, map routes, points APIs, manual-update APIs.
- `mqtt.js` - MQTT subscriber + PostgreSQL writer + manual command scheduler/discovery.
- `db-points-psql.js` - PostgreSQL query layer used by map APIs.
- `views/map-view.ejs` - Main map UI and interaction logic.
- `assets/` - Static web assets.

## Requirements

- Node.js 18+ (recommended)
- npm
- Reachable services:
  - MQTT broker
  - PostgreSQL

## Install

```bash
npm install
```

## Run

Note: `package.json` currently points `start` to `main.ts`, but runtime entry is `main.js`.

```bash
node main.js
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/map`

## Configuration

This project uses environment variables via `.env`.

1. Copy template:

```bash
cp .env.example .env
```

2. Fill in your local values.

3. Keep `.env` private (already gitignored).

### Supported env vars

- `MQTT_PROTOCOL`
- `MQTT_HOST`
- `MQTT_PORT`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `OWNTRACKS_BASE_TOPIC`
- `MQTT_DISCOVER_CMD_ENDPOINTS`
- `OWNTRACKS_CMD_DEFAULT_PAYLOAD`
- `OWNTRACKS_PRESET_CMD_ENDPOINTS` (JSON array)
- `PSQL_HOST`
- `PSQL_PORT`
- `PSQL_DB`
- `PSQL_USER`
- `PSQL_PASS`

## HTTP endpoints

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
- `GET /api/mqtt/manual-updates/watch`
  - payload/query: `clientId`, `intervalSeconds`
- `POST /api/mqtt/manual-updates/keepalive`
- `GET /api/mqtt/manual-updates/keepalive`
  - payload/query: `clientId`
- `POST /api/mqtt/manual-updates/unwatch`
- `GET /api/mqtt/manual-updates/unwatch`
  - payload/query: `clientId`
- `GET /api/mqtt/manual-updates/status`

Behavior:

- If multiple clients request different intervals, the fastest interval is used.
- Watchers are removed if keepalive is not refreshed within timeout.
- When no watchers remain, periodic manual commands stop.

## OwnTracks command endpoints

Preset command endpoints come from `OWNTRACKS_PRESET_CMD_ENDPOINTS`.

Dynamic discovery can also learn endpoints from incoming OwnTracks topics:

- Base topic from `OWNTRACKS_BASE_TOPIC` (default `owntracks`)
- Learns from topics like `owntracks/<user>/<device>/...`
- Converts to `owntracks/<user>/<device>/cmd`
- Uses `OWNTRACKS_CMD_DEFAULT_PAYLOAD`
- Controlled by `MQTT_DISCOVER_CMD_ENDPOINTS` (default `true`)

Preset format:

- JSON array of objects with:
  - `topic` (string)
  - `payload` (string)

Example:

```env
OWNTRACKS_PRESET_CMD_ENDPOINTS=[{"topic":"owntracks/alana/alanaphone/cmd","payload":"{\"_type\":\"cmd\",\"action\":\"reportLocation\"}"},{"topic":"owntracks/josh/JPGraphene/cmd","payload":"{\"_type\":\"cmd\",\"action\":\"reportLocation\"}"}]
```

Backward compatibility aliases are still accepted:

- `MQTT_MANUAL_COMMANDS`
- `MQTT_MANUAL_COMMAND_DEFAULT_PAYLOAD`

## UI highlights (current)

- Tracker filter, date range, and quick time-range controls.
- Manual MQTT refresh interval options: Off, 10s, 30s, 60s, 2m, 5m, 10m.
- Segment drawer with jump modes (Travel, Stops, Both) and prev/next navigation.
- Stop visualization:
  - stop radius circle with grayed center
  - stop points rendered in a muted style
  - selecting a stop highlights its circle and associated points
- Segment highlighting behavior:
  - selected segment is red
  - non-selected lines retain tracker color
  - selected segment highlight persists through live refresh redraws
- Live markers:
  - SVG pin markers with 2-character tracker IDs
  - all-tracker live overlay when a single tracker is selected and auto refresh is enabled
  - live refresh updates markers without recentering the map
- Floating collapsible legend:
  - tracker colors
  - stop circle/point examples
  - click tracker legend rows to disable/enable tracker rendering (disabled rows are gray)

## Troubleshooting

- Map loads but no tracks appear:
  - Confirm PostgreSQL is reachable and `gps_points` has data.
  - Check server logs for query errors.
- Manual updates do not fire:
  - Check `GET /api/mqtt/manual-updates/status` for active watchers.
  - Confirm keepalive calls are being sent.
  - Confirm MQTT connectivity/credentials.
- Data appears too sparse or too noisy:
  - Adjust accuracy filter and stop detection/sampling controls.

## License

MIT
