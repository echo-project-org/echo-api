const io = require('socket.io');

class WSWrapper {
  constructor() {
    this.io = null;
    this.protocol = "echo";
  }

  originIsAllowed(request) {
    if (!request.httpRequest.headers['sec-websocket-protocol'] || request.httpRequest.headers['sec-websocket-protocol'] !== this.protocol) {
      console.log("Invalid protocol, rejecting connection.");
      return false;
    }

    // put logic here to detect whether the specified origin is allowed.
    return true;
  }

  init(httpServer) {
    // WebSocket server
    this.io = io(httpServer);

    this.io.use((socket, next) => {
      // middleware to do whatever we want
      // const request = socket.request;
      next();
    });

    const Rooms = require("./rooms");
    new Rooms(this.io);

    return this;
  }

  registerHandlers() {
    return new Promise((resolve, reject) => {
      this.ws.on('request', (request) => {
        try {
          if (!this.originIsAllowed(request)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            console.log('Connection from origin ' + request.origin + ' rejected.');
            return;
          } else {
            console.log('Connection from origin ' + request.origin + ' accepted.');
          }

          const connection = request.accept(this.protocol, request.origin);
          connection.on('message', (message) => {
            switch (message.type) {
              case 'utf8':
                console.log('Received Message: ' + message.utf8Data);
                connection.sendUTF(message.utf8Data);
                break;
              case 'binary':
                console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                connection.sendBytes(message.binaryData);
                break;
            }
          });

          connection.on('close', (reasonCode, description) => {
            console.log('Peer ' + connection.remoteAddress + ' disconnected.');
          });

          resolve("WSWrapper initialized.");
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  send(data) {
    if (!this.ws) return console.error("WSWrapper not initialized.");

    if (typeof data === "object") data = JSON.stringify(data);

    this.ws.connections.forEach((connection) => {
      connection.sendUTF(data);
    });
  }
}

module.exports = new WSWrapper();