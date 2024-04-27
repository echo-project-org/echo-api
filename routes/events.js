const express = require("express");
const router = express.Router();

const facts = []
var clients = [];

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

router.get('/events', (req, res) => {
    const userId = req.body.authenticatedUserId;

    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    res.write("data: {\"status\": \"success\"}\n\n");

    clients.push({ id: userId, res });

    req.on('close', () => {
        console.log(`${userId} Connection closed`);
        clients = clients.filter(client => client.id !== userId);
    });

    // setInterval(() => {
    //     const message = `data: ${JSON.stringify(facts)}\n\n`;
    //     console.log(`Sending: facts`);
    //     clients.forEach(client => client.res.write(message));
    // }, 10000);
});

router.post('/events', (req, res) => {
    const { fact } = req.body;
    facts.push(fact);

    clients.forEach(client => client.res.write(`data: ${fact}\n\n`));
    res.json({ status: 'success' });
});

module.exports = router;