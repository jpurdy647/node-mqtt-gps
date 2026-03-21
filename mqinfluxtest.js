

const Influx = require('influx')
const express = require('express')
const http = require('http')
const os = require('os')

const app = express()

const JP_INFLUX_HOST = "10.10.1.2";
const JP_INFLUX__PORT = "8086";
const JP_INFLUX_DB = "ha";

const influx = new Influx.InfluxDB({
          host: JP_INFLUX_HOST,
          port: JP_INFLUX__PORT,
          database: JP_INFLUX_DB,
          schema: [
    {
      measurement: 'gps_test345',
      fields: {
                altitude: Influx.FieldType.FLOAT,
                latitude: Influx.FieldType.FLOAT,
                longitude: Influx.FieldType.FLOAT,
                gps_accuracy: Influx.FieldType.FLOAT,
                elevation: Influx.FieldType.FLOAT,
                battery: Influx.FieldType.FLOAT,
                velocity: Influx.FieldType.FLOAT,
      },
      tags: [
        'host'
      ]
    }
  ]
})

influx.getDatabaseNames()
  .then(names => {
    if (!names.includes('ha')) {
      return influx.createDatabase('ha');
    }
  })
  .then(() => {
    http.createServer(app).listen(3000, function () {
      console.log('Listening on port 3000')
    })
  })
  .catch(err => {
    console.error(`Error creating Influx database!`);
  })
  
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`Request to ${req.path} took ${duration}ms`);

    altitude = 0.0;
    latitude = 0.0;
    longitude = 0.0;
    influx.writePoints([
      {
        measurement: 'gps_test345',
        tags: { host: os.hostname() },
        fields: { altitude, latitude, longitude, gps_accuracy: 0.0, elevation: 0.0, battery: 0.0, velocity: 0.0 },
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  })
  return next()
})

app.get('/', function (req, res) {
  setTimeout(() => res.end('Hello world!'), Math.random() * 500)
})

app.get('/times', function (req, res) {
  influx.query(`
    select * from response_times
    where host = ${Influx.escape.stringLit(os.hostname())}
    order by time desc
    limit 10
  `).then(result => {
    res.json(result)
  }).catch(err => {
    res.status(500).send(err.stack)
  })
})