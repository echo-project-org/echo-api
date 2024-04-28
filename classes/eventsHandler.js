class EventsHandler {
  constructor() {
    this.events = {};
  }

  getEvents() {
    // get a list of events names
    return Object.keys(this.events);
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

  /**
   * Used to send event data to a specific client or a list of clients
   * 
   * @param {String} event name of the event
   * @param {String || Array} userId is string, then send the event to the specified user, could also be an array of user ids
   * @param {*} data 
   */
  sendEventTo(event, userId, data) {
    if (!this.events[event]) {
      console.log(`No clients connected to event ${event} or event does not exist`);
      return;
    }

    // if userid is array of numbers then send to all users in the array
    if (Array.isArray(userId)) {
      console.log(`Sending: ${jsonData} to ${event} event clients`);
      userId.forEach(id => {
        const jsonData = JSON.stringify(data);
        const message = `data: ${jsonData}\n\n`;
        const client = this.events[event].find(client => client.id === id);
        if (client) {
          client.res.write(message);
        }
      });
    } else {
      const jsonData = JSON.stringify(data);
      const message = `data: ${jsonData}\n\n`;
      console.log(`Sending: ${jsonData} to ${event} event clients`);
      const client = this.events[event].find(client => client.id === userId);
      if (client) {
        client.res.write(message);
      } else {
        console.log(`User ${userId} not found in ${event} event clients`);
      }
    }
  }

  /**
   * Used to send event data to all subscribed clients
   * 
   * @param {String} event name of the event
   * @param {*} data 
   * @returns 
   */
  sendEvent(event, data) {
    if (!this.events[event]) {
      console.log(`No clients connected to event ${event} or event does not exist`);
      return;
    }

    const jsonData = JSON.stringify(data);
    const message = `data: ${jsonData}\n\n`;
    console.log(`Sending: ${jsonData} to ${event} event clients`);
    this.events[event].forEach(client => client.res.write(message));
  }
}

module.exports = EventsHandler;