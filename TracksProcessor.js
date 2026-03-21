const { randomUUID } = require('crypto');

class TracksProcessor{

    static processPath(dbData){
        console.log("Processing path data:", dbData);
        var result = dbData.rows.map((item) => {
            return {
                time: item.time,
                tid: item.tracker_id,
                latitude: item.latitude,
                longitude: item.longitude,
                altitude: item.altitude,
                gps_accuracy: item.gps_accuracy,
                battery: item.battery,
                velocity: item.velocity,
                course: item.course,
                acceleration: item.acceleration,
                vertical_accuracy: item.vertical_accuracy,
                mode: item.mode,
                round_lat: item.round_lat,
                round_lon: item.round_lon,
                puid: randomUUID()
            }
        });
        console.log("Processed path data:", result);
        return result;
    }
}   
module.exports = TracksProcessor;