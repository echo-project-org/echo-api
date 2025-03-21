const express = require('express');
const server = express();
const bodyParser = require('body-parser');
const cors = require("cors");

const http = require('http');
const WSWrapper = require("./classes/wswrapper.js");

const cLoader = require("./classes/configLoader");
const config = new cLoader().getCfg();

const { Logger } = require("./classes/logger.js");
new Logger(config);

const db = require("./classes/echoDatabase");
const database = new db(config);

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

    // check if database is connected
    if (!req.database) {
        console.error("Database not connected. Exiting...");
        res.status(500).send({ message: "Database not connected. Exiting..." });
        return;
    }
    
    next();
});

server.use("/api/users", require("./routes/users"));
server.use("/api/rooms", require("./routes/rooms"));

const httpServer = http.createServer(server);
httpServer.listen(config.port, () => console.log("API online and listening on port", config.port));

WSWrapper.init(httpServer);