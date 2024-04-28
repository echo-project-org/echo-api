const express = require("express");
const router = express.Router();

router.use((req, res, next) => {
    const body = req.authenticator.checkToken(req, res);
    if (!body) return res.status(401).send({ message: "You are not authorized to do this." });
    if (body.scope !== "self") return res.status(401).send({ message: "You are not authorized to do this." });

    // get user id from token
    const uId = req.authenticator.getUserId(req.headers.authorization);
    //add user id to request
    req.body.authenticatedUserId = uId;

    next();
});

router.get('/messages', (req, res) => {
    req.eventsHandler.addEvent('messages', req, res);
});

router.get("/rooms", (req, res) => {
    req.eventsHandler.addEvent('rooms', req, res);
});

router.get("/users", (req, res) => {
    req.eventsHandler.addEvent('users', req, res);
});

router.get("/", (req, res) => {
    // get list of events
    const events = req.eventsHandler.getEvents();
    res.json(events);
});

module.exports = router;