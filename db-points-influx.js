/*

Select distinct trackers

Query points in date range

Date format: RFC3339 UTC


*/

Influx = require("influx");


const JP_INFLUX_HOST = "10.10.1.2";
const JP_INFLUX__PORT = "8086";
const JP_INFLUX_DB = "ha";


class pointsDBConnector {

    //make this function return a promise rather than use a callback
  queryPointsHours(hours, tracker_id, errorCallback = null) {
    console.log("Querying points for tracker_id:", tracker_id, "hours:", hours);
    var now = new Date();
    var millis_end = now.getTime();
    var millis_start = millis_end - (hours * 60 * 60 * 1000);
    console.log("Calculated millis_start:", millis_start, "millis_end:", millis_end);
    return this.queryPoints(millis_start, millis_end, tracker_id, errorCallback);
  }

    //make this function return a promise rather than use a callback
  queryPoints(millis_start, millis_end, tracker_id, errorCallback = null) {
    //convert to nanoseconds for the query since InfluxDB uses nanosecond precision for timestamps
    return this.influx
      .query(
        `
        select *
        from gps_data
        where 
          time >= ${millis_start*1000000}
          and
          time < ${millis_end*1000000} 
          and
          tracker_id = '${tracker_id}'
        order by time desc
        `,
        /*

      alana_alanaphone
      alana_pixel_9_pro_fold
      josh_jpgraphene
      lane_nlpgraphene
      lisa_llp

      */
      ).catch((err) => {
        console.error(`Error querying InfluxDB: ${err}`);
        console.error(`Query was: ${`
        select *
        from gps_data
        where 
          time >= ${millis_start*1000000}
          and
          time < ${millis_end*1000000}
          and
          tracker_id = '${tracker_id}'
        order by time desc
        `}`); 

        if (errorCallback) {
          errorCallback(err);
        }
      });
  }


    // queryPoints(24, 'josh_jpgraphene', (results) => {
    //   console.log(results);
    // });

    queryPointsPromise(hours, tracker_id) {
      return this.queryPoints(
        Date.now() - (hours * 60 * 60 * 1000),
        Date.now(),
        tracker_id
      );
    }

  constructor(){
    this.influx = 
        new Influx.InfluxDB({
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

    this.queryPointsPromise(24, 'jp').then((results) => {
      console.log(results);
    }).catch((err) => {
      console.error(`Error querying InfluxDB: ${err}`);
    });
  }

  /**
   * First, we create a new Influx client and tell it to use the
   * `express_response_db` database by default, and give it some information about
   * the schema we're writing.
   */         


  getDistinctTrackers(errorCallback = null) {
    return this.influx
      .query("SHOW TAG VALUES WITH KEY = \"tracker_id\""  //ToDo
      ).catch((err) => {
        console.error(`Error querying InfluxDB: ${err}`);
        if (errorCallback) {
          errorCallback(err);
        }
      });
  }

}

module.exports = pointsDBConnector;

/*

> show measurements
name: measurements
name
----
state


> show field keys from state
name: state
fieldKey                     fieldType
--------                     ---------
altitude                     float
current_latitude             float
current_longitude            float
current_position             float
device_trackers_str          string
devicetracker_entityid_str   string
devicetracker_zone_name_str  string
devicetracker_zone_str       string
elevation                    float
friendly_name                float
friendly_name_str            string
gps_accuracy                 float
latitude                     float
longitude                    float



> show tag keys from state
name: state
tagKey
------
entity_id





> show series from state
key
---
state,domain=device_tracker,entity_id=alana_alanaphone
state,domain=device_tracker,entity_id=alana_pixel_9_pro_fold
state,domain=device_tracker,entity_id=josh_jpgraphene
state,domain=device_tracker,entity_id=lane_nlpgraphene
state,domain=device_tracker,entity_id=lisa_llp







> show measurements
name: measurements
name
----
%
% available
gal
h
response_times
state
°
°F
> show field keys from state
name: state
fieldKey                     fieldType
--------                     ---------
Allows VoIP                  float
Carrier ID                   float
Carrier Name_str             string
Current Radio Technology_str string
ISO Country Code_str         string
Low Power Mode               float
Mobile Country Code          float
Mobile Network Code          float
actions_str                  string
altitude                     float
attribution_str              string
auto_update                  float
azimuth                      float
backup_stage_str             string
battery_level                float
battery_status               float
city_str                     string
cloud_coverage               float
country_code_str             string
country_str                  string
county_str                   string
course                       float
current                      float
current_latitude             float
current_longitude            float
current_position             float
current_slot                 float
current_slot_str             string
device_class_str             string
device_trackers_str          string
devicetracker_entityid_str   string
devicetracker_zone_name_str  string
devicetracker_zone_str       string
dew_point                    float
direction_of_travel_str      string
display_options_str          string
display_precision            float
distance_from_home_km        float
distance_from_home_m         float
distance_from_home_mi        float
distance_traveled_m          float
distance_traveled_mi         float
editable                     float
elevation                    float
entities_str                 string
entity_picture               float
entity_picture_str           string
event_type_str               string
event_types_str              string
failed_reason_str            string
formatted_address            float
formatted_address_str        string
friendly_name                float
friendly_name_str            string
gps_accuracy                 float
home_latitude                float
home_longitude               float
home_zone_str                string
humidity                     float
icon_str                     string
id                           float
id_str                       string
in_progress                  float
installed_version            float
installed_version_str        string
is_volume_muted              float
last_changed                 float
last_changed_str             string
last_place_name              float
last_place_name_str          string
last_triggered               float
last_triggered_str           string
last_updated                 float
last_updated_str             string
latest_version               float
latest_version_str           string
latitude                     float
longitude                    float
map_link_str                 string
mode_str                     string
neighbourhood_str            string
next_dawn                    float
next_dawn_str                string
next_dusk                    float
next_dusk_str                string
next_midnight                float
next_midnight_str            string
next_noon                    float
next_noon_str                string
next_rising                  float
next_rising_str              string
next_setting                 float
next_setting_str             string
next_slot                    float
next_trigger                 float
next_trigger_str             string
options_str                  string
osm_details_dict_str         string
osm_dict_str                 string
osm_id                       float
osm_type_str                 string
passive                      float
persons_str                  string
place_name                   float
place_name_str               string
place_type                   float
place_type_str               string
postal_code                  float
postal_town_str              string
precipitation_unit_str       string
pressure                     float
pressure_unit_str            string
previous_latitude            float
previous_longitude           float
radius                       float
release_summary_str          string
release_url_str              string
rising                       float
skipped_version_str          string
source_list_str              string
source_str                   string
source_type_str              string
speed                        float
state                        string
state_abbr_str               string
state_province_str           string
street                       float
street_number                float
street_number_str            string
street_str                   string
supported_features           float
tags_str                     string
temperature                  float
temperature_unit_str         string
tid_str                      string
timeslots                    float
timeslots_str                string
title_str                    string
update_percentage_str        string
user_id                      float
user_id_str                  string
uv_index                     float
value                        float
velocity                     float
vertical_accuracy            float
visibility_unit_str          string
volume_level                 float
weekdays_str                 string
wikidata_dict_str            string
wikidata_id                  float
wikidata_id_str              string
wind_bearing                 float
wind_speed                   float
wind_speed_unit_str          string

> show tag keys from state
name: state
tagKey
------
entity_id
> show series from state
key
---
state,domain=automation,entity_id=new_automation
state,domain=automation,entity_id=stale_gps_lane
state,domain=automation,entity_id=zeb_room_motion
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_motion_detection
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_tampering_product_cover_removed
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_window_door_is_closed
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_window_door_is_closed_2
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_window_door_is_open
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_window_door_is_open_2
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_window_door_is_open_in_regular_position
state,domain=binary_sensor,entity_id=josh_and_alana_bedroom_window_door_is_open_in_tilt_position
state,domain=button,entity_id=josh_and_alana_bedroom_idle_home_security_motion_sensor_status
state,domain=cover,entity_id=garage_door
state,domain=device_tracker,entity_id=alana_alanaphone
state,domain=device_tracker,entity_id=alana_pixel_9_pro_fold
state,domain=device_tracker,entity_id=josh_jpgraphene
state,domain=device_tracker,entity_id=lane_nlpgraphene
state,domain=device_tracker,entity_id=lisa_llp
state,domain=event,entity_id=backup_automatic_backup
state,domain=media_player,entity_id=living_room_tv
state,domain=person,entity_id=alana
state,domain=remote,entity_id=living_room_tv
state,domain=sensor,entity_id=alana
state,domain=sensor,entity_id=alana_phone_battery_state
state,domain=sensor,entity_id=alana_phone_charger_type
state,domain=sensor,entity_id=alana_pixel_9_pro_fold_battery_state
state,domain=sensor,entity_id=alana_pixel_9_pro_fold_charger_type
state,domain=sensor,entity_id=backup_backup_manager_state
state,domain=sensor,entity_id=backup_last_attempted_automatic_backup
state,domain=sensor,entity_id=backup_last_successful_automatic_backup
state,domain=sensor,entity_id=backup_next_scheduled_automatic_backup
state,domain=sensor,entity_id=dimmer_outlet_last_seen
state,domain=sensor,entity_id=dimmer_outlet_node_status
state,domain=sensor,entity_id=iphone_app_version
state,domain=sensor,entity_id=iphone_audio_output
state,domain=sensor,entity_id=iphone_battery_state
state,domain=sensor,entity_id=iphone_bssid
state,domain=sensor,entity_id=iphone_connection_type
state,domain=sensor,entity_id=iphone_geocoded_location
state,domain=sensor,entity_id=iphone_last_update_trigger
state,domain=sensor,entity_id=iphone_location_permission
state,domain=sensor,entity_id=iphone_sim_1
state,domain=sensor,entity_id=iphone_sim_2
state,domain=sensor,entity_id=iphone_ssid
state,domain=sensor,entity_id=josh
state,domain=sensor,entity_id=josh_and_alana_bedroom_last_seen
state,domain=sensor,entity_id=josh_and_alana_bedroom_node_status
state,domain=sensor,entity_id=josh_coords
state,domain=sensor,entity_id=josh_graphene_2_battery_state
state,domain=sensor,entity_id=josh_graphene_2_charger_type
state,domain=sensor,entity_id=lane
state,domain=sensor,entity_id=lane_phone_battery_state
state,domain=sensor,entity_id=lane_phone_charger_type
state,domain=sensor,entity_id=last_fence_pulse_time
state,domain=sensor,entity_id=lisa
state,domain=sensor,entity_id=node_22_last_seen
state,domain=sensor,entity_id=node_22_node_status
state,domain=sensor,entity_id=pixel_10_pro_lane_battery_state
state,domain=sensor,entity_id=pixel_10_pro_lane_charger_type
state,domain=sensor,entity_id=pixel_9_pro_fold_battery_state
state,domain=sensor,entity_id=pixel_9_pro_fold_charger_type
state,domain=sensor,entity_id=quickstick_combo_status
state,domain=sensor,entity_id=sm_s928u1_battery_state
state,domain=sensor,entity_id=sm_s928u1_charger_type
state,domain=sensor,entity_id=sun_next_dawn
state,domain=sensor,entity_id=sun_next_dusk
state,domain=sensor,entity_id=sun_next_midnight
state,domain=sensor,entity_id=sun_next_noon
state,domain=sensor,entity_id=sun_next_rising
state,domain=sensor,entity_id=sun_next_setting
state,domain=sun,entity_id=sun
state,domain=switch,entity_id=nodered_f47e924f49b8e315_2
state,domain=switch,entity_id=schedule_005864
state,domain=switch,entity_id=schedule_168447
state,domain=switch,entity_id=schedule_4ff10e
state,domain=update,entity_id=advanced_ssh_web_terminal_update
state,domain=update,entity_id=blueiris_nvr_update
state,domain=update,entity_id=esphome_device_builder_update
state,domain=update,entity_id=hacs_update
state,domain=update,entity_id=home_assistant_core_update
state,domain=update,entity_id=home_assistant_supervisor_update
state,domain=update,entity_id=josh_and_alana_bedroom_firmware
state,domain=update,entity_id=midea_smart_ac_update
state,domain=update,entity_id=node_red_companion_update
state,domain=update,entity_id=node_red_update
state,domain=update,entity_id=places_update
state,domain=update,entity_id=pyscript_update
state,domain=update,entity_id=quickstick_combo_firmware
state,domain=update,entity_id=samba_share_update
state,domain=update,entity_id=samsungtv_tizen_update
state,domain=update,entity_id=scheduler_card_update
state,domain=update,entity_id=scheduler_component_update
state,domain=update,entity_id=sleep_as_android_update
state,domain=update,entity_id=tabbed_card_update
state,domain=update,entity_id=tv_remote_card_with_touchpad_and_haptic_feedback_update
state,domain=update,entity_id=tv_touchpad_remote_card_update
state,domain=update,entity_id=variables_history_update
state,domain=weather,entity_id=forecast_home
state,domain=zone,entity_id=church
state,domain=zone,entity_id=home
> 

*/