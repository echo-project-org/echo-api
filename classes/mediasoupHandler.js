const mediasoup = require("mediasoup");
const os = require("os");
const Colors = require("./colors");
const colors = new Colors();

const codecs = [{
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
    parameters: {
        useinbandfec: 1,
        minptipe: 10,
        maxaveragebitrate: 510000,
        stereo: 1,
        maxplaybackrate: 48000
    }
},
{
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
        "packetization-mode": 1,
        "profile-level-id": "42001f",
        "level-asymmetry-allowed": 1
    }
}];

const workerParams = {
    logLevel: 'debug',
    logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp'
    ],
    rtcMinPort: 40000,
    rtcMaxPort: 49999
}

class MediasoupHandler {
    constructor() {
        this.workers = [];
        this.routers = new Map();

        let numberOfWorkers = os.cpus().length;
        console.log("Creating", numberOfWorkers, "workers");

        for (let i = 0; i < numberOfWorkers; i++) {
            mediasoup.createWorker(workerParams).then((worker) => {
                this.workers.push(worker);
                console.log(colors.changeColor("cyan", "[W-" + worker.pid + "] Worker created"));

                worker.on('died', (e) => {
                    console.log(colors.changeColor("red", "[W-" + worker.pid + "] died!"));
                    let index = this.workers.indexOf(worker);
                    if (index != -1) {
                        this.workers.splice(index, 1);
                    }
                });

                worker.observer.on('close', () => {
                    console.log(colors.changeColor("red", "[W-" + worker.pid + "] closed!"));
                    let index = this.workers.indexOf(worker);
                    if (index != -1) {
                        this.workers.splice(index, 1);
                    }
                });

                worker.observer.on('newrouter', (router) => {
                    console.log(colors.changeColor("cyan", "[W-" + worker.pid + "] New router with id " + router.id));
                });
            });
        }
    }

    /**
     * Get the worker with the minimum usage
     * @returns Promise
     */
    _getMinUsageWorker() {
        return new Promise(async (resolve, reject) => {
            let minUsage = Infinity;
            let minWorker = null;

            for (const worker of this.workers) {
                let usage = await worker.getResourceUsage();
                console.log(colors.changeColor("cyan", "[W-" + worker.pid + "] Worker usage: " + usage.ru_utime));
                if (usage.ru_utime < minUsage) {
                    minUsage = usage.ru_utime;
                    minWorker = worker;
                } else if (minWorker === null) {
                    minWorker = worker;
                }
            }

            resolve(minWorker);
        });
    }

    /**
     * Create a mediasoup router (room)
     * @param {*} rId Room id
     * @returns Promise
     */
    async createRouter(rId) {
        return new Promise(async (resolve, reject) => {
            //check if room already exists
            if (this.routers.get(rId)) {
                resolve(true);
            } else {
                let worker = await this._getMinUsageWorker();
                let router = await worker.createRouter({ mediaCodecs: codecs });
                this.routers.set(rId, {
                    router: router,
                    transports: new Map()
                });
                resolve(true);
            }
        });
    }

    /**
     * Delete a mediasoup router (room)
     * @param {*} rId Room id
     * @returns Promise
     */
    async deleteRouter(rId) {
        return new Promise(async (resolve, reject) => {
            let router = this.routers.get(rId);
            if (!router) {
                reject("Router not found!");
            } else {
                //close all transports
                router.transports.forEach((value, key) => {
                    value.audioInTransport.close();
                    value.audioOutTransport.close();
                    value.videoInTransport.close();
                    value.videoOutTransport.close();
                });

                router.close();
                this.routers.delete(rId);
                resolve(true);
            }
        });
    }

    /**
     * Create transports for a user in a room
     * @param {*} uId User id
     * @param {*} rId Room id
     * @returns Promise
     */
    async createTransports(uId, rId) {
        //find router in map
        return new Promise(async (resolve, reject) => {
            let router = this.routers.get(rId);
            if (!router) {
                reject("Router not found!");
            } else {
                const transportParams = {
                    listenIps: [
                        {
                            ip: '0.0.0.0',
                            announcedIp: 'echo.kuricki.com'
                        },
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                    appData: { peerId: uId }
                }

                const audioInTransport = await router.createWebRtcTransport(transportParams);
                const audioOutTransport = await router.createWebRtcTransport(transportParams);
                const videoInTransport = await router.createWebRtcTransport(transportParams);
                const videoOutTransport = await router.createWebRtcTransport(transportParams);

                router.transports.set(uId, {
                    "audioInTransport": audioInTransport,
                    "audioOutTransport": audioOutTransport,
                    "videoInTransport": videoInTransport,
                    "videoOutTransport": videoOutTransport
                });

                resolve({
                    "routerCapabilities": router.rtpCapabilities,
                    audioInTransport,
                    audioOutTransport,
                    videoInTransport,
                    videoOutTransport
                })
            }
        });
    }

    /**
     * Delete transports for a user in a room
     * @param {*} uId User id
     * @param {*} rId Room id
     * @returns Promise  
     */
    async deleteTransports(uId, rId) {
        return new Promise(async (resolve, reject) => {
            let router = this.routers.get(rId);
            if (!router) {
                reject("Router not found!");
            } else {
                let transports = router.transports.get(uId);
                if (!transports) {
                    reject("Transports not found!");
                } else {
                    transports.audioInTransport.close();
                    transports.audioOutTransport.close();
                    transports.videoInTransport.close();
                    transports.videoOutTransport.close();
                    router.transports.delete(uId);
                    resolve(true);
                }
            }
        });
    }
}

module.exports = MediasoupHandler;