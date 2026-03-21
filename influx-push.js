

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
                altitude: Influx.FieldType.FLOAT,
                latitude: Influx.FieldType.FLOAT,
                longitude: Influx.FieldType.FLOAT,
                gps_accuracy: Influx.FieldType.FLOAT,
                elevation: Influx.FieldType.FLOAT,
                battery: Influx.FieldType.FLOAT,
                velocity: Influx.FieldType.FLOAT,
              },
              tags: ["round_lat", "round_lon", "device_id"],
            },
          ],
      });

function writeGpsDataToInflux(gpsData) {
const { latitude, longitude, altitude, gps_accuracy, elevation, battery, velocity } = gpsData;
const round_lat = Math.round(latitude * 100) / 100;
const round_lon = Math.round(longitude * 100) / 100;

    influx.writePoints([
        {
            measurement: 'gps_data',
            tags: { 
                device_id: "test_device",
                round_lat: round_lat.toString(),
                round_lon: round_lon.toString(),
            },
            fields: { 
                altitude: altitude,
                latitude: latitude,
                longitude: longitude,
                gps_accuracy: gps_accuracy,
                elevation: elevation,
                battery: battery,
                velocity: velocity,
            },
        }
    ]).then(() => {
        console.log('GPS data written to InfluxDB successfully');
    }).catch((error) => {
        console.error('Error writing GPS data to InfluxDB:', error);
    });
}