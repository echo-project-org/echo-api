class EventsHandler {
  constructor() {
    this.events = {};
  }

  addEvent(event, req, res) {
    const userId = req.body.authenticatedUserId;
    if (!this.events[event]) {
      this.events[event] = [];
    } else {
      // check if user is already in the event
      const user = this.events[event].find(client => client.id === userId);
      if (user) {
        console.log(`${userId} is already in the event`);
        res.status(400).json({ message: "You are already in the event" });
        return;
      }
    }

    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    const data = JSON.stringify({ status: "success", userId });
    res.write(`data: ${data}\n\n`);

    this.events[event].push({ id: userId, res });

    req.on('close', () => {
        console.log(`${userId} Connection closed`);
        this.events[event] = this.events[event].filter(client => client.id !== userId);
    });

    req.on('error', () => {
        console.log(`${userId} Connection error`);
        this.events[event] = this.events[event].filter(client => client.id !== userId);
    });
  }

  sendEvent(event, data) {
    if (!this.events[event]) {
      console.log(`No clients connected to ${event} or event does not exist`);
      return;
    }

    const jsonData = JSON.stringify(data);
    const message = `data: ${jsonData}\n\n`;
    console.log(`Sending: ${jsonData} to ${event} event clients`);
    this.events[event].forEach(client => client.res.write(message));
  }
}

module.exports = EventsHandler;