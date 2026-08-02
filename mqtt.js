const mqtt = require('mqtt');
const Influx = require('influx');
require('dotenv').config();

const protocol = process.env.MQTT_PROTOCOL || 'mqtt';
const host = process.env.MQTT_HOST || '127.0.0.1';
const port = process.env.MQTT_PORT || '1883';
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;
const clientId = `node_trackermqtt_${Math.random().toString(16).slice(3)}`;

const connectUrl = `${protocol}://${host}:${port}`;

const JP_INFLUX_HOST = process.env.INFLUX_HOST || '127.0.0.1';
const JP_INFLUX__PORT = process.env.INFLUX_PORT || '8086';
const JP_INFLUX_DB = process.env.INFLUX_DB || 'ha';

const influx = new Influx.InfluxDB({
    host: JP_INFLUX_HOST,
    port: JP_INFLUX__PORT,
    database: JP_INFLUX_DB,
    schema: [
        {
            measurement: 'gps_data',
            fields: {
                latitude: Influx.FieldType.FLOAT,
                longitude: Influx.FieldType.FLOAT,
                altitude: Influx.FieldType.FLOAT,
                gps_accuracy: Influx.FieldType.FLOAT,
                battery: Influx.FieldType.FLOAT,
                velocity: Influx.FieldType.FLOAT,
                course: Influx.FieldType.FLOAT,
                acceleration: Influx.FieldType.FLOAT,
                vertical_accuracy: Influx.FieldType.FLOAT,
            },
            tags: ['round_lat', 'round_lon', 'tracker_id', 'mode'],
        },
    ],
});

function writeGpsDataToInflux(gpsData) {
    const {
        time,
        tid,
        latitude,
        longitude,
        altitude,
        gps_accuracy,
        battery,
        velocity,
        course,
        acceleration,
        vertical_accuracy,
        mode,
    } = gpsData;

    const round_lat = Math.round(latitude * 100) / 100;
    const round_lon = Math.round(longitude * 100) / 100;

    influx.writePoints([
        {
            measurement: 'gps_data',
            tags: {
                tracker_id: tid.toString(),
                round_lat: round_lat.toString(),
                round_lon: round_lon.toString(),
                mode: mode.toString(),
            },
            fields: {
                altitude,
                latitude,
                longitude,
                gps_accuracy,
                battery,
                velocity,
                course,
                acceleration,
                vertical_accuracy,
            },
            time: new Date(time * 1000).getMilliseconds() * 1000,
        },
    ]).catch((error) => {
        console.error('Error writing GPS data to InfluxDB:', error);
    });
}

const MANUAL_COMMANDS = [
    { topic: 'owntracks/alana/alanaphone/cmd', payload: '{"_type":"cmd","action":"reportLocation"}' },
    { topic: 'owntracks/josh/JPGraphene/cmd', payload: '{"_type":"cmd","action":"reportLocation"}' },
    { topic: 'owntracks/lane/NLPGraphene/cmd', payload: '{"_type":"cmd","action":"reportLocation"}' },
    { topic: 'owntracks/lisa/llp/cmd', payload: '{"_type":"cmd","action":"reportLocation"}' },
];

const KEEPALIVE_TIMEOUT_MS = 30 * 1000;
const KEEPALIVE_RECOMMENDED_SECONDS = 20;
const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 3600;

const updateWatchers = new Map();
let manualCommandIntervalHandle = null;
let currentEffectiveIntervalMs = null;

function toSafeIntervalSeconds(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.max(MIN_INTERVAL_SECONDS, Math.min(MAX_INTERVAL_SECONDS, parsed));
}

function pruneInactiveWatchers(nowMs = Date.now()) {
    for (const [clientWatcherId, watcher] of updateWatchers.entries()) {
        if (!watcher || (nowMs - watcher.lastSeenMs) > KEEPALIVE_TIMEOUT_MS) {
            updateWatchers.delete(clientWatcherId);
        }
    }
}

function getEffectiveIntervalMs() {
    let fastestMs = null;
    for (const watcher of updateWatchers.values()) {
        const intervalMs = watcher.intervalSeconds * 1000;
        if (fastestMs === null || intervalMs < fastestMs) {
            fastestMs = intervalMs;
        }
    }
    return fastestMs;
}

function sendManualUpdateCommands() {
    pruneInactiveWatchers();
    if (updateWatchers.size === 0) {
        refreshManualCommandScheduler();
        return;
    }

    if (!client.connected) {
        console.warn('Manual MQTT update commands skipped because MQTT client is disconnected.');
        return;
    }

    MANUAL_COMMANDS.forEach(({ topic, payload }) => {
        client.publish(topic, payload, { qos: 0 }, (error) => {
            if (error) {
                console.error(`Failed to publish manual update command to ${topic}`, error);
            }
        });
    });
}

function refreshManualCommandScheduler() {
    pruneInactiveWatchers();
    const nextEffectiveIntervalMs = getEffectiveIntervalMs();

    if (!nextEffectiveIntervalMs) {
        if (manualCommandIntervalHandle) {
            clearInterval(manualCommandIntervalHandle);
            manualCommandIntervalHandle = null;
            currentEffectiveIntervalMs = null;
            console.log('Manual MQTT update scheduler stopped (no active watchers).');
        }
        return;
    }

    if (manualCommandIntervalHandle && currentEffectiveIntervalMs === nextEffectiveIntervalMs) {
        return;
    }

    if (manualCommandIntervalHandle) {
        clearInterval(manualCommandIntervalHandle);
    }

    currentEffectiveIntervalMs = nextEffectiveIntervalMs;
    manualCommandIntervalHandle = setInterval(sendManualUpdateCommands, currentEffectiveIntervalMs);
    console.log(`Manual MQTT update scheduler set to ${Math.round(currentEffectiveIntervalMs / 1000)}s.`);
}

function registerManualUpdateWatcher(clientWatcherId, intervalSeconds) {
    const safeClientWatcherId = (clientWatcherId || '').trim();
    const safeIntervalSeconds = toSafeIntervalSeconds(intervalSeconds);

    if (!safeClientWatcherId) {
        throw new Error('clientId is required');
    }
    if (!safeIntervalSeconds) {
        throw new Error('intervalSeconds must be a number');
    }

    updateWatchers.set(safeClientWatcherId, {
        intervalSeconds: safeIntervalSeconds,
        lastSeenMs: Date.now(),
    });

    refreshManualCommandScheduler();
    sendManualUpdateCommands();

    return getManualUpdateStatus();
}

function keepAliveManualUpdateWatcher(clientWatcherId) {
    const safeClientWatcherId = (clientWatcherId || '').trim();
    if (!safeClientWatcherId || !updateWatchers.has(safeClientWatcherId)) {
        return false;
    }

    const watcher = updateWatchers.get(safeClientWatcherId);
    watcher.lastSeenMs = Date.now();
    refreshManualCommandScheduler();
    return true;
}

function unregisterManualUpdateWatcher(clientWatcherId) {
    const safeClientWatcherId = (clientWatcherId || '').trim();
    if (!safeClientWatcherId) {
        return false;
    }

    const deleted = updateWatchers.delete(safeClientWatcherId);
    refreshManualCommandScheduler();
    return deleted;
}

function getManualUpdateStatus() {
    pruneInactiveWatchers();
    const nowMs = Date.now();

    const watchers = Array.from(updateWatchers.entries()).map(([clientWatcherId, watcher]) => ({
        clientId: clientWatcherId,
        intervalSeconds: watcher.intervalSeconds,
        lastSeenSecondsAgo: Math.max(0, Math.round((nowMs - watcher.lastSeenMs) / 1000)),
    }));

    return {
        activeWatcherCount: watchers.length,
        effectiveIntervalSeconds: currentEffectiveIntervalMs ? Math.round(currentEffectiveIntervalMs / 1000) : null,
        keepAliveTimeoutSeconds: KEEPALIVE_TIMEOUT_MS / 1000,
        keepAliveRecommendedSeconds: KEEPALIVE_RECOMMENDED_SECONDS,
        commands: MANUAL_COMMANDS,
        watchers,
    };
}

setInterval(() => {
    pruneInactiveWatchers();
    refreshManualCommandScheduler();
}, 5000);

const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username,
    password,
    reconnectPeriod: 1000,
});

client.on('connect', () => {
    console.log('Connected, subscribing to topic "owntracks/#"');
    client.subscribe('owntracks/#', { qos: 0 }, (error) => {
        if (error) {
            console.error('Subscribe error:', error);
        } else {
            console.log('Subscribed successfully to topic "owntracks/#"');
        }
    });
});

client.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString());

    try {
        const parsedPayload = JSON.parse(payload.toString());
        writeGpsDataToInflux({
            time: parsedPayload.tst,
            tid: parsedPayload.tid,
            latitude: parsedPayload.lat,
            longitude: parsedPayload.lon,
            altitude: parsedPayload.alt,
            gps_accuracy: parsedPayload.acc,
            battery: parsedPayload.batt,
            velocity: parsedPayload.vel,
            course: parsedPayload.cog,
            acceleration: parsedPayload.acc,
            vertical_accuracy: parsedPayload.vac,
            mode: parsedPayload.m,
        });
    } catch (err) {
        console.error('Failed to parse MQTT payload:', err);
    }
});

module.exports = {
    registerManualUpdateWatcher,
    keepAliveManualUpdateWatcher,
    unregisterManualUpdateWatcher,
    getManualUpdateStatus,
    sendManualUpdateCommands,
};
