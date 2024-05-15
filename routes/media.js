const express = require("express");
const router = express.Router();

const { fullAuthenticationMiddleware, getRoomIdFromUserId } = require("../classes/utils");

// connect transport
router.post('/transport/connect', fullAuthenticationMiddleware, (req, res) => {
    const { id, type, data } = req.body;
    console.log(id)
    if (!id || !type || !data) return res.status(400).json({ message: "Provide transport connection data" });

    // Get roomId from db
    getRoomIdFromUserId(req.database, id).then(({ roomId, serverId }) => {
        console.log("roomId", roomId, "serverId", serverId)
        req.ms.transportConnect(type, id, roomId, serverId, data)
            .then(result => res.status(200).json({ "res": "Transport connected" }))
            .catch(error => res.status(500).json(error));
    }).catch(error => res.status(400).json("Error getting roomId: " + error));

});

// produce audio
router.post('/audio/produce', fullAuthenticationMiddleware, (req, res) => {
    const { id, data } = req.body;
    console.log(id)
    if (!id || !data) return res.status(400).json({ message: "Provide valid userId and mediasoup data" });

    // Get roomId from db
    getRoomIdFromUserId(req.database, id).then(({ roomId, serverId }) => {
        console.log("roomId", roomId, "serverId", serverId)
        req.ms.produceAudio(id, roomId, serverId, data)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(500).json(error));
    }).catch(error => res.status(400).json("Error getting roomId: " + error));
});

// consume audio
router.post('/audio/consume', fullAuthenticationMiddleware, (req, res) => {
    const { id, roomId, data } = req.body;
    if (!id || !roomId || !data) return res.status(400).json({ message: "Provide valid userId, roomId and mediasoup data" });
    //TODO get id and room id from db

    req.ms.consumeAudio(id, roomId, data)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

// resume audio
router.post('/audio/resume', fullAuthenticationMiddleware, (req, res) => {
    const { id, roomId } = req.body;
    if (!id || !roomId) return res.status(400).json({ message: "Provide valid userId and roomId" });
    //TODO get id and room id from db

    req.ms.resumeAudio(id, roomId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

module.exports = router;