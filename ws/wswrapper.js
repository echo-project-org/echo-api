import MediasoupManager from '../classes/mediasoupManager.js';
import { Server as io } from 'socket.io';

class WSWrapper {
  constructor() {
    this.io = null;
    this.authenticator = null;
    this.config = null;
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

  init(httpServer, authenticator, config) {
    // WebSocket server
    this.io = new io(httpServer);
    this.authenticator = authenticator;
    this.config = config;

    this.io.use((socket, next) => {
      //check if there is a valid token
      const request = socket.request;
      if (!request.headers.authorization) {
        if (this.config.env !== "dev") {
          return next(new Error('No token provided'));
        } else {
          //dev mode, allow all connections
          next();
        }
      } else {
        //remove the Bearer part
        let token = request.headers.authorization.split(" ")[1];
        this.authenticator.verifyToken(token).then((tokenBody) => {
          //add the verified id to the socket
          socket.verifiedId = verifiedId;
          next();
        }).catch((err) => {
          //if the token is invalid, reject the connection
          next(new Error('Invalid token'));
        });
      }
    });

    //const Rooms = require("./rooms");
    //new Rooms(this.io);

    const msManager = new MediasoupManager();

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

export default WSWrapper;