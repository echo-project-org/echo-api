class EventsHandler {
  constructor() {
    this.events = {};
    this.clients = [];
  }

  addEvent(event) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
  }

  register(req, res) {
    const body = req.authenticator.checkToken(req, res);
    if (!body) return res.status(401).send({ message: "You are not authorized to do this." });
    if (body.scope !== "self") return res.status(401).send({ message: "You are not authorized to do this." });

    const uId = req.authenticator.getUserId(req.headers.authorization);
    req.body.authenticatedUserId = uId;

    this.clients.push({ id: uId, res });
  }
}

module.exports = EventsHandler;