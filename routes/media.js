const express = require("express");
const router = express.Router();

const { fullAuthenticationMiddleware } = require("../classes/utils");

// connect transport
router.post('/transport/connect', fullAuthenticationMiddleware, (req, res) => {
    const { id, roomId, type, data } = req.body;
    if (!id || !roomId || !type || !data) return res.status(400).json({ message: "Provide transport connection data" });
    //TODO get id and room id from db

    req.ms.transportConnect(type, id, roomId, data)
        .then(result => res.status(200).json("Transport connected"))
        .catch(error => res.status(500).json(error));
});

// produce audio
router.post('/audio/produce', fullAuthenticationMiddleware, (req, res) => {
    const { id, roomId, data } = req.body;
    if (!id || !roomId || !data) return res.status(400).json({ message: "Provide valid userId, roomId and mediasoup data" });
    //TODO get id and room id from db
    
    req.ms.produceAudio(id, roomId, data)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
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