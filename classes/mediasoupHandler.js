const mediasoup = require("mediasoup");
const os = require("os");
const Colors = require("./colors");
const colors = new Colors();

class MediasoupHandler {
    workerParams = {
        logLevel: 'debug',
        logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp'
        ],
        //TODO get ports from config
        rtcMinPort: 40000,
        rtcMaxPort: 49999
    }

    codecs = [{
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
        parameters: {
            useinbandfec: 1,
            minptipe: 10,
            //TODO allow bitrate to be set programmatically
            maxaveragebitrate: 510000,
            stereo: 1,
            maxplaybackrate: 48000
        }
    },
    {
        kind: "video",
        //TODO allow codec to be set programmatically
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42001f",
            "level-asymmetry-allowed": 1
        }
    }]

    constructor() {
        this.workers = [];
        this.routers = new Map();

        let numberOfWorkers = os.cpus().length;
        console.log("Creating", numberOfWorkers, "workers");

        for (let i = 0; i < numberOfWorkers; i++) {
            mediasoup.createWorker(this.workerParams).then((worker) => {
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
    createRouter(rId, sId) {
        return new Promise(async (resolve, reject) => {
            //check if room already exists
            let fullRoomId = rId + "@" + sId;
            if (this.routers.get(fullRoomId)) {
                resolve(true);
            } else {
                try {
                    let worker = await this._getMinUsageWorker();
                    let router = await worker.createRouter({ mediaCodecs: this.codecs });
                    this.routers.set(fullRoomId, {
                        router: router,
                        transports: new Map()
                    });
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    /**
     * Delete a mediasoup router (room)
     * @param {*} rId Room id
     * @param {*} sId Server id
     * @returns Promise
     */
    deleteRouter(rId, sId) {
        return new Promise(async (resolve, reject) => {
            let fullRoomId = rId + "@" + sId;
            let router = this.routers.get(fullRoomId);
            if (!router) {
                reject("Router not found!");
            } else {
                try {
                    //close all transports
                    router.transports.forEach((value, key) => {
                        value.audioInTransport.close();
                        value.audioOutTransport.close();
                        value.videoInTransport.close();
                        value.videoOutTransport.close();
                    });

                    router.close();
                    this.routers.delete(fullRoomId);
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    /**
     * Create transports for a user in a room
     * @param {*} uId User id
     * @param {*} rId Room id
     * @param {*} sId Server id
     * @returns Promise
     */
    createTransports(uId, rId, sId) {
        //find router in map
        return new Promise(async (resolve, reject) => {
            let fullRoomId = rId + "@" + sId;
            let { router, transports } = this.routers.get(fullRoomId);

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
                try {
                    var audioInTransport = await router.createWebRtcTransport(transportParams);
                    var audioOutTransport = await router.createWebRtcTransport(transportParams);
                    var videoInTransport = await router.createWebRtcTransport(transportParams);
                    var videoOutTransport = await router.createWebRtcTransport(transportParams);

                    transports.set(uId, {
                        "audioIn": audioInTransport,
                        "audioOut": audioOutTransport,
                        "videoIn": videoInTransport,
                        "videoOut": videoOutTransport,
                        "audioInProducer": null,
                        "audioOutProducer": null,
                        "videoInProducer": null,
                        "videoOutProducer": null
                    });

                    resolve({
                        "routerCapabilities": router.rtpCapabilities,
                        "transports": {
                            "audioOut": {
                                id: audioInTransport.id,
                                iceParameters: audioInTransport.iceParameters,
                                iceCandidates: audioInTransport.iceCandidates,
                                dtlsParameters: audioInTransport.dtlsParameters,
                                sctpParameters: audioInTransport.sctpParameters,
                                iceServers: audioInTransport.iceServers,
                                iceTransportPolicy: audioInTransport.iceTransportPolicy,
                                additionalSettings: audioInTransport.additionalSettings,
                            },
                            "audioIn": {
                                id: audioOutTransport.id,
                                iceParameters: audioOutTransport.iceParameters,
                                iceCandidates: audioOutTransport.iceCandidates,
                                dtlsParameters: audioOutTransport.dtlsParameters,
                                sctpParameters: audioOutTransport.sctpParameters,
                                iceServers: audioOutTransport.iceServers,
                                iceTransportPolicy: audioOutTransport.iceTransportPolicy,
                                additionalSettings: audioOutTransport.additionalSettings,
                            },
                            "videoOut": {
                                id: videoInTransport.id,
                                iceParameters: videoInTransport.iceParameters,
                                iceCandidates: videoInTransport.iceCandidates,
                                dtlsParameters: videoInTransport.dtlsParameters,
                                sctpParameters: videoInTransport.sctpParameters,
                                iceServers: videoInTransport.iceServers,
                                iceTransportPolicy: videoInTransport.iceTransportPolicy,
                                additionalSettings: videoInTransport.additionalSettings,
                            },
                            "videoIn": {
                                id: videoOutTransport.id,
                                iceParameters: videoOutTransport.iceParameters,
                                iceCandidates: videoOutTransport.iceCandidates,
                                dtlsParameters: videoOutTransport.dtlsParameters,
                                sctpParameters: videoOutTransport.sctpParameters,
                                iceServers: videoOutTransport.iceServers,
                                iceTransportPolicy: videoOutTransport.iceTransportPolicy,
                                additionalSettings: videoOutTransport.additionalSettings,
                            }
                        }
                    })
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    /**
     * Delete transports for a user in a room
     * @param {*} uId User id
     * @param {*} rId Room id
     * @returns Promise  
     */
    async deleteTransports(uId, rId, sId) {
        return new Promise(async (resolve, reject) => {
            let fullRoomId = rId + "@" + sId;
            let router = this.routers.get(fullRoomId);
            if (!router) {
                reject("Router not found!");
            } else {
                let transports = router.transports.get(uId);
                if (!transports) {
                    reject("Transports not found!");
                } else {
                    try {
                        transports.audioInTransport.close();
                        transports.audioOutTransport.close();
                        transports.videoInTransport.close();
                        transports.videoOutTransport.close();
                        router.transports.delete(uId);
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                }
            }
        });
    }

    /**
     * Convert client side transport type to server side
     * @param {string} type Type of transport [audioIn, audioOut, videoIn, videoOut]
     * @returns string Server side transport type
     */
    _convertClientSideTransportTypeToServerSide(type) {
        switch (type) {
            case "audioIn":
                return "audioOut";
            case "audioOut":
                return "audioIn";
            case "videoIn":
                return "videoOut";
            case "videoOut":
                return "videoIn";
            default:
                return null;
        }
    }

    /**
     * Used to connect the transport
     * @param {*} type Type of transport [audioIn, audioOut, videoIn, videoOut]
     * @param {*} uId  User id
     * @param {*} rId  Room id
     * @param {*} sId  Server id
     * @param {*} data Data given by mediasoup client
     * @returns Promise
    */
    async transportConnect(type, uId, rId, sId, data) {
        return new Promise(async (resolve, reject) => {
            type = this._convertClientSideTransportTypeToServerSide(type);
            if (!type) reject("Invalid transport type");

            let fullRoomId = rId + "@" + sId;
            let router = this.routers.get(fullRoomId);

            if (!router) {
                reject("Router not found!");
            } else {
                let transports = router.transports.get(uId);
                if (!transports) {
                    reject("Seems like the user is trying to connect without joining a room!");
                } else {
                    try {
                        const t = transports[type]
                        console.log(transports)
                        if (!t) reject("Transport not found! Type: " + type + " - " + fullRoomId);

                        t.connect({
                            dtlsParameters: data,
                        }).then(() => {
                            resolve(true);
                        })
                    } catch (error) {
                        reject(error);
                    }
                }
            }
        });
    }

    /**
     * Used to produce audio
     * @param {*} uId  User id
     * @param {*} rId  Room id
     * @param {*} sId  Server id
     * @param {*} data Data given by mediasoup client
     * @returns Promise with producer id (send to mediasoup client)
     */
    async produceAudio(uId, rId, sId, data) {
        return new Promise(async (resolve, reject) => {
            let fullRoomId = rId + "@" + sId;
            let router = this.routers.get(fullRoomId);
            if (!router) {
                console.error("Router not found!");
                reject("Router not found!");
            } else {
                let transports = router.transports.get(uId);
                if (!transports) {
                    console.error("Transports not found!");
                    reject("Transports not found!");
                } else {
                    try {
                        let producer = await transports.audioIn.produce({
                            id: data.id,
                            kind: data.kind,
                            rtpParameters: data.rtpParameters,
                            appData: data.appData
                        });
                        transports.audioInProducer = producer;
                        resolve({ "producerId": producer.id });
                    } catch (error) {
                        console.error(error);
                        reject(error);
                    }
                }
            }
        });
    }

    /**
     * Used to consume audio
     * @param {*} uId  User id
     * @param {*} rId  Room id
     * @param {*} sId  Server id
     * @param {*} data Data given by mediasoup client
     * @returns Promise
     */
    async consumeAudio(uId, rId, sId, data) {
        return new Promise(async (resolve, reject) => {
            let fullRoomId = rId + "@" + sId;
            let router = this.routers.get(fullRoomId);
            if (!router) {
                reject("Router not found!");
            } else {
                let transports = router.transports.get(uId);
                if (!transports) {
                    reject("Transports not found!");
                } else {
                    try {
                        let consumer = await transports.audioOutTransport.consume({
                            producerId: data.producerId,
                            rtpCapabilities: data.rtpCapabilities,
                            paused: true
                        });

                        resolve({
                            id: consumer.id,
                            producerId: data.producerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters
                        });
                    } catch (error) {
                        reject(error);
                    }
                }
            }
        });
    }

    /**
     * Resume audio stream once client is ready to receive
     * @param {*} uId  User id
     * @param {*} rId  Room id
     * @param {*} sId  Server id
     * @returns Promise
     */
    async resumeAudio(uId, rId, sId) {
        return new Promise(async (resolve, reject) => {
            let fullRoomId = rId + "@" + sId;
            let router = this.routers.get(fullRoomId);
            if (!router) {
                reject("Router not found!");
            } else {
                let transports = router.transports.get(uId);
                if (!transports) {
                    reject("Transports not found!");
                } else {
                    try {
                        if (transports.audioOutProducer) {
                            await transports.audioOutProducer.resume();
                            resolve(true);
                        } else {
                            reject("Producer not found!");
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            }
        });
    }
}

module.exports = MediasoupHandler;