import mediasoup from 'mediasoup';
import Colors from './colors.js';
const colors = new Colors();
import os from 'os';

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

class MediasoupManager {
    constructor() {
        this.numberOfWorkers = os.cpus().length;
        this.workers = [];
        this.rooms = new Map();

        this.initWorkers();
    }

    initWorkers() {
        console.log(colors.changeColor("magenta", "Creating " + this.numberOfWorkers + " workers..."));
        for (let i = 0; i < this.numberOfWorkers; i++) {
            mediasoup.createWorker({
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
            }).then((worker) => {
                this.workers.push(worker);
                console.log(colors.changeColor("magenta", "[W-" + worker.pid + "] Worker created"));

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
                    console.log(colors.changeColor("magenta", "[W-" + worker.pid + "] New router with id " + router.id));
                });
            });
        }
    }

    addRoom(roomId) {
        return new Promise(async (resolve, reject) => {
            if (!this.rooms.has(roomId)) {
                this._getMinUsageWorker().then(async (minWorker) => {
                    //create a router
                    let r = await minWorker.createRouter({ mediaCodecs: codecs, appData: { roomId: roomId } });
                    r.observer.on('close', () => {
                        console.log(colors.changeColor("cyan", "[R-" + r.id + "] Mediasoup router closed"));
                    });

                    r.observer.on('newtransport', (transport) => {
                        console.log(colors.changeColor("cyan", "[R-" + r.id + "] Mediasoup transport created with id " + transport.id));
                    });

                    console.log(colors.changeColor("green", "New room " + id + " created"));
                    this.rooms.set(roomId, {
                        roomId: roomId,
                        private: false,
                        users: new Map(),
                        password: null,
                        display: "Room-" + roomId,
                        msRouter: r
                    });

                    resolve();
                });
            }
        });
    }

    removeRoom(roomId) {
        if (this.rooms.has(roomId)) {
            let room = this.rooms.get(roomId);
            room.msRouter.close();
            this.rooms.delete(roomId);
            console.log(colors.changeColor("red", "Room " + roomId + " removed"));
        }
    }

    addUserToRoom(data, user) {
        const roomId = data.roomId;
        const room = this.rooms.get(roomId);

        if(!room){
            this.addRoom(roomId);
            room = this.rooms.get(roomId);
        }

        if (room) {
            room.users.set(user.id, user);
            console.log(colors.changeColor("green", "User " + user.id + " joining room " + roomId));

            const router = room.msRouter;
            this.createTransportsForUser(user, router).then(() => {
                console.log(colors.changeColor("magenta", "Transports created for user " + user.id));
            }).catch((error) => {
                console.error(colors.changeColor("red", "Error creating transports for user " + user.id + ": " + error));
            });
        } else {
            console.error(colors.changeColor("red", "Could not add user to room " + roomId));
        }
    }

    removeUserFromRoom(userId) {
        for (const room of this.rooms.values()) {
            if (room.users.has(userId)) {
                let user = room.users.get(userId);
                user.clearTransports();
                console.log(colors.changeColor("red", "User " + userId + " removed from room " + room.roomId));
                room.users.delete(userId);

                if (room.users.size === 0) {
                    this.removeRoom(room.roomId);
                }

                break;
            }
        }

    }

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

    createTransportsForUser(user, router){
        return new Promise(async (resolve, reject) => {
            try {
                router.createWebRtcTransport({
                    listenIps: [
                        {
                            ip: '0.0.0.0',
                            announcedIp: 'echo.kuricki.com'
                        },
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                    appData: { peerId: user.id }
                }).then((transport) => {
                    user.setReceiveTransport(transport, router.rtpCapabilities);
                });
    
                //Create sender transport
                router.createWebRtcTransport({
                    listenIps: [
                        {
                            ip: '0.0.0.0',
                            announcedIp: 'echo.kuricki.com'
                        },
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                    appData: { peerId: user.id }
                }).then((transport) => {
                    user.setSendTransport(transport, router.rtpCapabilities);
                });
    
                //Create video receive transport
                router.createWebRtcTransport({
                    listenIps: [
                        {
                            ip: '0.0.0.0',
                            announcedIp: 'echo.kuricki.com'
                        },
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                    appData: { peerId: user.id }
                }).then((transport) => {
                    user.setReceiveVideoTransport(transport, router.rtpCapabilities);
                });
    
                //Create video sender transport
                router.createWebRtcTransport({
                    listenIps: [
                        {
                            ip: '0.0.0.0',
                            announcedIp: 'echo.kuricki.com'
                        },
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                    appData: { peerId: user.id }
                }).then((transport) => {
                    user.setSendVideoTransport(transport, router.rtpCapabilities);
                });
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    getUsersInRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            return room.users;
        }
        return null;
    }
}

export default MediasoupManager;