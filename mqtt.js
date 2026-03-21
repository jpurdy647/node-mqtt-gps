const mqtt = require('mqtt');
const { time } = require('node:console');
const { write } = require('node:fs');

const protocol = 'mqtt'
const host = '10.10.1.12'
const port = '1883'
const username = 'node_tracker';
const password = 'REDACTED_SECRET';
const clientId = `node_trackermqtt_${Math.random().toString(16).slice(3)}`

const connectUrl = `${protocol}://${host}:${port}`



Influx = require("influx");

const JP_INFLUX_HOST = "10.10.1.2";
const JP_INFLUX__PORT = "8086";
const JP_INFLUX_DB = "ha";

const influx = new Influx.InfluxDB({
          host: JP_INFLUX_HOST,
          port: JP_INFLUX__PORT,
          database: JP_INFLUX_DB,
          schema: [
            {
              measurement: "gps_data",
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
              tags: ["round_lat", "round_lon", "tracker_id", "mode"],
            },
          ],
      });

function writeGpsDataToInflux(gpsData) {
const { time, tid, latitude, longitude, altitude, gps_accuracy, battery, velocity, course, acceleration, vertical_accuracy, mode } = gpsData;
const round_lat = Math.round(latitude * 100) / 100;
const round_lon = Math.round(longitude * 100) / 100;

console.log("Writing GPS data to InfluxDB:", {
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
    round_lat,
    round_lon
});

    influx.writePoints([
        {
            measurement: 'gps_data',
            tags: { 
                tracker_id: tid.toString(),
                round_lat: round_lat.toString(),
                round_lon: round_lon.toString(),
                mode: mode.toString()
            },
            fields: { 
                altitude: altitude,
                latitude: latitude,
                longitude: longitude,
                gps_accuracy: gps_accuracy,
                battery: battery,
                velocity: velocity,
                course: course,
                acceleration: acceleration,
                vertical_accuracy: vertical_accuracy,
            },
            time: new Date(time * 1000).getMilliseconds()*1000 // Convert Unix timestamp to JavaScript Date object
        }
    ]).then(() => {
        console.log('GPS data written to InfluxDB successfully');
    }).catch((error) => {
        console.error('Error writing GPS data to InfluxDB:', error);
    });
}




const client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: username,
  password: password,
  reconnectPeriod: 1000,
})

client.on('connect', () => {
  console.log('Connected, subscribing to topic "owntracks/#"');
    client.subscribe('owntracks/#', { qos: 0 }, (error) => {
        if (error) {
        console.error('Subscribe error:', error);
        } else {
        console.log('Subscribed successfully to topic "owntracks/#"');
        }
    });
})

client.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString())

    //logging acc, lat, lon, alt, and batt values from payload
    payload = JSON.parse(payload.toString());
    // console.log("Acc: ", payload.acc);
    // console.log("Lat: ", payload.lat);
    // console.log("Lon: ", payload.lon);
    // console.log("Alt: ", payload.alt);
    // console.log("Batt: ", payload.batt);
    // console.log("Vel: ", payload.vel);
    // console.log("Course: ", payload.cog);
    // console.log("Acceleration: ", payload.acc);
    // console.log("Vertical Accuracy: ", payload.vac);
    // console.log("Mode: ", payload.m);
    // console.log("Time: ", payload.tst);
    // console.log("Tracker ID: ", payload.tid);

    writeGpsDataToInflux({
        time: payload.tst,
        tid: payload.tid,
        latitude: payload.lat,
        longitude: payload.lon,
        altitude: payload.alt,
        gps_accuracy: payload.acc,
        battery: payload.batt,
        velocity: payload.vel,
        course: payload.cog,
        acceleration: payload.acc,
        vertical_accuracy: payload.vac,
        mode: payload.m
    });
})