const express = require("express");
const router = express.Router();

const facts = []
const clients = [];

router.get('/events', (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const data = `data: ${JSON.stringify(facts)}\n\n`;

    res.write(data);

    const clientId = Date.now();

    const newClient = {
        id: clientId,
        res
    };

    clients.push(newClient);

    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });

    setInterval(() => {
        const message = `data: ${JSON.stringify(facts)}\n\n`;
        console.log(`Sending: facts`);
        clients.forEach(client => client.res.write(message));
    }, 10000);
});

router.post('/events', (req, res) => {
    const { fact } = req.body;
    facts.push(fact);

    clients.forEach(client => client.res.write(`data: ${fact}\n\n`));

    res.json({ status: 'success' });
});

module.exports = router;