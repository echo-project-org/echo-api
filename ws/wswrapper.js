import MediasoupManager from '../classes/mediasoupManager.js';
import { Server as io } from 'socket.io';
import User from './user.js';

class WSWrapper {
  constructor() {
    this.io = null;
    this.authenticator = null;
    this.config = null;
    this.msManager = null;
    this.protocol = "echo";
    this.connectedClients = new Map();
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
    this.msManager = new MediasoupManager();

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

    this.io.on('connection', async (socket) => {
      const req = socket.request;
      const userId = socket.verifiedId;

      //create a new user
      const user = new Users(userId, socket, this.msManager);
      console.log("User connected: " + userId);

      //add the user to the connected clients
      this.connectedClients.set(userId, user);
    });

  }
}

export default WSWrapper;