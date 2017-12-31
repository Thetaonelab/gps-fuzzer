# gps-fuzzer

<img src="logo.png" width="150px" alt="logo">

*gps-fuzzer* interpolates LatLong points along a polyline and publishes the points data to a given mqtt topic. There are REST APIs available for 

* starting a fuzzer on a topic
* stopping an existing fuzzer on a particular topic and 


## Pre requisite

* node and npm
* A mqtt broker running.


## Installation

```
git clone https://github.com/Eyezon/gps-fuzzer.git
cd gps-fuzzer/
npm install
```

## How to use

### Setup MQTT broker

Open `package.json` and set your MQTT broker address and port by editing the following line. currently we are using a public broker called `iot.ecllipse.org`on port `1883`. You should use your own during actual use.

`"start": "cross-env MQTT_CERT=./DST_Root_CS_x3.pem MQTT_PROTOCOL=[mqtt|mqtts] MQTT_USERNAME=<username-or-blank> MQTT_PASSWORD=<password-or-blank> MQTT_BROKER=iot.eclipse.org MQTT_PORT=1883 node ./server.js"`

Remove MQTT_CERT env var if you don't want pem.

### Starting the server

`npm start`

This command will start the fuzzing server at localhost:9999. Now you have three REST APIs as follows:


### Start a fuzzer - /fuzzgps

POST the following JSON to http://localhost:9999/fuzzgps

`
    {
        "tripId":12
        "points":[{ "lati": 25.30, "longi": 88.30 }, { "lati": 24.30, "longi": 88.00 } , { "lati": 25.30, "longi": 89.00 }],
        "topic":"eyezon/livegps",
        "interval":1000,
        "duration":4000,
        "loop":true
    }
`


| Option | Datatype | Meaning |
|--------|--------|---------|
| tripId   | Integer  | An unique identifier of the virtual trip along the polyline|
| points   | Array of LatLong objects | A polyline represented by array of LatLongs|
| topic    | String   | The MQTT topic which received fuzz data |
| interval | integer  | The interval in milliseconds in which the fuzzer will publish new data |
| duration | Integer  | The time in milliseconds which will be the time to traverse a leg of the polyline|
| loop     | boolean  | If you want to reverse the order of fuzzing after raching end of the polyline |



The API returns the following JSON on successful fuzzing started.

`{ "success": "true", "message": "Started Fuzzing at eyezon/livegps" } `

The API returns the following JSON if fuzzing is already being done on the given topic.

`{ "success": "true", "message": "Already Fuzzing at eyezon/livegps" } `


A MQTT client which subcribes on eyezon/livegps, will recieve the fuzz data in the following format:

`{ "lati":22.34,"longi":88.10, "currentSpeed": speed, version: 1, tripId: 15, angle:123.2 }`




### Stop a fuzzer - /stopfuzzgps

GET request to http://localhost:9999/stopfuzzgps with parameter topic = <topic_name> will stop the fuzzer on the given topic.



## TODO

* Random gaussian error on fuzzed values
* Support bounded path  (e.g. circle, polygon)
