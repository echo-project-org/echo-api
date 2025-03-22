const sqlite3 = require('sqlite3').verbose();

class EchoDatabase {
    constructor(config) {
        console.log("Database filename:", config.database.filename);
        if (!config.database.filename) {
            this.db = new sqlite3.Database('data/echoDatabase.db');
        } else {
            this.db = new sqlite3.Database(config.database.filename);
        }

        this.createTables();
        this.createPlaceholderRoom();
    }

    getConnection() {
        return this.db;
    }

    closeConnection() {
        this.db.close();
    }

    createTables() {
        try {
            this.db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hashedIdentity TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL DEFAULT 'Anonymous',
                lastIP TEXT NOT NULL DEFAULT '0.0.0.0',
                lastLogin INTEGER NOT NULL DEFAULT current_timestamp,
                firstLogin INTEGER NOT NULL DEFAULT current_timestamp,
                img TEXT,
                online INTEGER NOT NULL DEFAULT 0,
                muted INTEGER NOT NULL DEFAULT 0,
                deaf INTEGER NOT NULL DEFAULT 0
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL DEFAULT 'Room name',
                description TEXT NOT NULL DEFAULT 'Room description',
                maxUsers INTEGER NOT NULL DEFAULT 200,
                img TEXT,
                bannerImg TEXT,
                orderIndex INTEGER NOT NULL UNIQUE
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS roomUsers (
                userId TEXT,
                roomId INTEGER,
                PRIMARY KEY (userId, roomId),
                FOREIGN KEY (userId) REFERENCES users(hashedIdentity),
                FOREIGN KEY (roomId) REFERENCES rooms(id)
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS serverRoles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS userServerRoles (
                userId INTEGER,
                roleId INTEGER,
                PRIMARY KEY (userId, roleId),
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (roleId) REFERENCES serverRoles(id)
            )`);
        } catch (err) {
            console.error("Error creating tables", err);
        }
    }

    createPlaceholderRoom() {
        try {
            //if there are no rooms
            this.db.get(`SELECT * FROM rooms`, (err, row) => {
                if (!row) {
                    this.db.run(`INSERT INTO rooms (name, description, maxUsers, orderIndex) VALUES ('Room 1', 'Welcome to Echo!', 200, 0)`);
                }
            });
        } catch (err) {
            console.error("Error creating placeholder room", err);
        }
    }
}

module.exports = EchoDatabase;