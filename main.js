import WSWrapper from './ws/wswrapper.js';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import cLoader from './classes/configLoader.js';
import Logger from './classes/logger.js';
import EchoDatabase from './classes/echoDatabase.js';
import { Auth } from './classes/auth.js';
import rooms from './routes/rooms.js';
import users from './routes/users.js';

const server = express();
const config = new cLoader().getCfg();
const logger = new Logger(config);

const database = new EchoDatabase(config);const authenticator = new Auth(config);

// add body parser middleware for api requests
server.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
server.use(bodyParser.json({ limit: '5mb' }));

server.use(cors());

server.use((req, res, next) => {
    console.log(">> Got api request - Query:", req.url, "Method:", req.method);
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "Authorization");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (!req.utils) req.utils = require("./classes/utils");
    if (!req.database) req.database = database.getConnection();
    //if (!req.cache) req.cache = cache;
    if (!req.config) req.config = config;

    if (!req.deployMode) req.deployMode = config.env;

    if (!req.authenticator) req.authenticator = authenticator;

    // check if database is connected
    if (!req.database) {
        console.error("Database not connected. Exiting...");
        res.status(500).send({ message: "Database not connected. Exiting..." });
        return;
    }

    next();
});

server.use("/api/users", users);
server.use("/api/rooms", rooms);

const httpServer = http.createServer(server);
httpServer.listen(config.port, () => console.log("API online and listening on port", config.port));

const wsWrapper = new WSWrapper();
wsWrapper.init(httpServer, authenticator, config);