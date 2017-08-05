module.exports = class Fuzzer {
    constructor(points, duration, loop) {
        this.points = points
        this.duration = duration
        this._currentDuration = 0
        this._interpolator = this._interpolator.bind(this)
        this.fuzzGps = this.fuzzGps.bind(this)
        this._deg2rad = this._deg2rad.bind(this)
        this._rad2deg = this._rad2deg.bind(this)
        this._getDistanceFromLatLonInKm = this._getDistanceFromLatLonInKm.bind(this)
        this._computeAngle = this._computeAngle.bind(this)
        this.loop = loop ? loop : false

        this.internalInterval = 100
        this.summedInternalInterval = 0
    }

    _interpolator(source, destination, t) {
        var k = t / this.duration
        k = (k > 0) ? k : 0
        k = (k > 1) ? 1 : k
        return {
            lati: source.lati + k * (destination.lati - source.lati),
            longi: source.longi + k * (destination.longi - source.longi)
        }
    }
    _deg2rad(deg) {
        return deg * (Math.PI / 180)
    }
    _rad2deg(rad) {
        return (rad * 180) / Math.PI
    }
    _getDistanceFromLatLonInKm(lat, lng, _lat, _lng) {
        var radlat1 = Math.PI * lat / 180
        var radlat2 = Math.PI * _lat / 180
        var theta = lng - _lng
        var radtheta = Math.PI * theta / 180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta)
        dist = Math.acos(dist)
        dist = dist * 180 / Math.PI
        dist = dist * 60 * 1.1515
        dist = dist * 1.609344
        return dist
    }

    _computeAngle(lat1, long1, lat2, long2) {
        var dLon = (long2 - long1)

        var y = Math.sin(dLon) * Math.cos(lat2)
        var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1)
            * Math.cos(lat2) * Math.cos(dLon)

        var brng = Math.atan2(y, x)

        brng = this._rad2deg(brng)
        brng = (brng + 360) % 360
        brng = 360 - brng // count degrees counter-clockwise - remove to make clockwise

        return brng
    }



    fuzzGps(interval, callback, endCallback) {
        console.log(this.points)
        var elapsedTime = 0
        var distanceTravelled = 0
        var pointIndexFrom = 0
        var pointIndexTo = 1
        var pointsLength = this.points.length
        var previous = null
        this.intervalObj = setInterval(() => {

            if (elapsedTime == 0) {
                console.log("STARTING ", this.points[pointIndexFrom], this.points[pointIndexTo])
            }
            elapsedTime += this.internalInterval
            var v = this._interpolator(this.points[pointIndexFrom], this.points[pointIndexTo], elapsedTime)
            if (v.lati == this.points[pointIndexTo].lati && v.longi == this.points[pointIndexTo].longi) {
                console.log("Reached! " + pointIndexTo)
                if (pointIndexTo == (pointsLength - 1)) {
                    if (!this.loop) {
                        clearInterval(this.intervalObj)
                        if (endCallback) endCallback()
                    }
                    else {
                        elapsedTime = 0
                        distanceTravelled = 0
                        pointIndexFrom = 0
                        pointIndexTo = 1
                        this.points.reverse()
                    }
                }
                else {
                    elapsedTime = 0
                    distanceTravelled = 0
                    pointIndexFrom += 1
                    pointIndexTo += 1
                }
            }

            var speed = 0
            var angle = 0
            if (previous) {
                var dist = this._getDistanceFromLatLonInKm(previous.lati, previous.longi, v.lati, v.longi)
                distanceTravelled = distanceTravelled + dist
                if (distanceTravelled != 0 && elapsedTime != 0) {
                    speed = Math.ceil((distanceTravelled * 1000 * 60 * 60) / elapsedTime, 10)
                }

                angle = this._computeAngle(previous.lati, previous.longi, v.lati, v.longi)
                if (Math.abs(angle) > 180) {
                    angle = (-1) * (360 - Math.abs(angle))
                }
            }

            this.summedInternalInterval += this.internalInterval
            //console.log('INTERNAL -',v, speed, angle,this.summedInternalInterval)
            if (this.summedInternalInterval >= interval) {
                if (callback) {
                    //console.log('PUBLISHING ..', v, speed, angle)
                    callback(v, speed, angle)
                }
                this.summedInternalInterval = 0
            }

            previous = v
        }, this.internalInterval)
    }
}

