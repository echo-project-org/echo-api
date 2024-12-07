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

const OAuth = require("./classes/auth");
const authenticator = new OAuth();

const SQL = require("./classes/mysql");
const database = new SQL(config);

//const CacheHandler = require("./classes/cacheHandler.js");
//const cache = new CacheHandler(config);

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
    if (!req.authenticator) req.authenticator = authenticator;
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
server.use("/api/app", require("./routes/app"));
server.use("/api/auth", require("./routes/auth"));
server.use("/api/servers", require("./routes/servers"));

const httpServer = http.createServer(server);
httpServer.listen(config.port, () => console.log("API online and listening on port", config.port));

WSWrapper.init(httpServer);