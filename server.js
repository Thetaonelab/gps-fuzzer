var compression = require('compression');
var express = require('express');
var http = require('http');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require('path');
var fs = require('fs')

const app = express()
    .use(compression())
    .use(cookieParser())
    .use(morgan('tiny'))
    .use(bodyParser.json({ limit: '50mb' }));



var mqtt = require('mqtt');
var Fuzzer = require('./fuzzer');

var cert = process.env.MQTT_CERT && fs.readFileSync(process.env.MQTT_CERT);
var protocol = process.env.MQTT_PROTOCOL || 'mqtt'
var client = mqtt.connect(`${process.env.MQTT_PROTOCOL}://${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`,
    {
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        cert: cert
    })
client.on('connect', function () {
    console.log("MQTT Connected!")

})

var sampleJson = `{
        payload:{ 
            "tripId":15, 
            "deviceId":123
        },
        "points":[{ "lati": 25.30, "longi": 88.30 }, { "lati": 24.30, "longi": 88.00 } , { "lati": 25.30, "longi": 89.00 }],
        "topic":"eyezon/livegps",
        "interval":400,
        "duration":4000,
        "loop":true
    }`
client.on('error', function (...args) {
    console.log(args)
})

var sampleJsonStr = JSON.stringify(sampleJson)

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var intervalObjs = {}

function unsubscribe(topic){
    if(intervalObjs[topic]){
        clearInterval(intervalObjs[topic])
        delete intervalObjs[topic]
        return true
    }else{
        return false
    }
}

function checkSubscribtion(topic){
    return intervalObjs[topic] !== undefined
}

/*
function addSubscribtion(topic, intervalHandle){
    intervalObj[topic] = intervalHandle
}
*/

app.post('/fuzzgps', function (req, res) {

    if (!client.connected) {
        res.status(500).send({ success: false, message: "COULD NOT CONNECT TO MQTT SERVER!" });
        return;
    }
    //console.log(req.body)
    const { points, topic, interval, duration, loop, payload } = req.body

    if (unsubscribe( topic )) {
        //res.json({ success: true, message: "Already Fuzzing at " + topic });
        //return;
        console.log("Already fuzzing at " + topic)
        console.log("Updating fuzzer ...");
    }
    else {
        console.log("Starting fuzzer ...");
    }


    console.log("Publishing to " + topic)
    var fuzzer = new Fuzzer(points, duration, loop);
    fuzzer.fuzzGps(interval, (v, speed, angle) => {
        //var send = Object.assign({ "currentSpeed": speed, version: 1, tripId: tripId, angle: angle }, v)
        var send = Object.assign({ "currentSpeed": speed, angle, version: 1 }, v, payload)
        client.publish(topic, JSON.stringify(send))
    }, () => { delete intervalObjs[topic] });
    intervalObjs[topic] = fuzzer.intervalObj;
    res.json({ success: true, message: "Started Fuzzing at " + topic });
})

app.get('/stopfuzzgps', function (req, res) {
    try {
        var topic = req.query.topic
        if (unsubscribe( topic )) {
            console.log("Stopped Publishing to " + topic)
            res.json({ success: true, message: "Stopped Fuzzing at " + topic });
        } else {
            console.log("/stopfuzzgps: already stopped", topic)
            return res.json({ success: true, message: "Fuzzer is already stopped. topic: " + topic })
        }
    }
    catch (e) {
        res.send(500, { success: false, message: "Error stopping fuzzing at" + topic });
    }

});

const PORT = process.env.NODE_PORT || 9999;
const server = http.createServer(app);
server.listen(PORT);
console.log(`GPS Fuzzer started.
            Send fuzz request at http://localhost:${PORT}/fuzzgps
            FORMAT: 
                ${sampleJson}`);
