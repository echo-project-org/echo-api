const express = require("express");
const router = express.Router();
const {
    fullAuthenticationMiddleware,
    partialAuthenticationMiddleware
} = require("../classes/utils");

router.subscribe('/messages', partialAuthenticationMiddleware, (req, res) => {
    req.eventsHandler.addEvent('messages', req, res);
});

router.subscribe("/rooms", partialAuthenticationMiddleware, (req, res) => {
    req.eventsHandler.addEvent('rooms', req, res);
});

router.subscribe("/users", partialAuthenticationMiddleware, (req, res) => {
    req.eventsHandler.addEvent('users', req, res);
});

router.subscribe("/servers", partialAuthenticationMiddleware, (req, res) => {
    req.eventsHandler.addEvent('servers', req, res);
});

router.get("/", partialAuthenticationMiddleware, (req, res) => {
    // get list of events
    const events = req.eventsHandler.getEvents();
    res.json(events);
});

module.exports = router;