const path = require("path");
const fs = require("fs");

class Logger {
    constructor(config) {
        this.config = config.logger;
        this.path = this.config.logDirectory;
        this.fileStream = null;
        this.logStream = null;

        this.logFilePath = path.resolve("./", this.path);
        this.logFile = path.resolve("./", this.path, this.config.fileName);

        this.log = this.log.bind(this);
        this.error = this.error.bind(this);
        this.warn = this.warn.bind(this);
        this.checkFolder();
        this.checkFile();
        this.checkOldFiles();
        this.createStream();

        this.internalId = this.id();
        console.log = this.log;
        console.error = this.error;
        console.warn = this.warn;
        console.log("------------------------- LOG STARTED -------------------------");
    }

    // make id function where A are letters and 0 are numbers
    // 0A00AA0000AAA
    id() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        let id = "";
        for (let i = 0; i < 12; i++) {
            if (i == 1 || i == 4) {
                id += numbers.charAt(Math.floor(Math.random() * numbers.length));
            } else {
                id += letters.charAt(Math.floor(Math.random() * letters.length));
            }
        }
        return id;
    }

    createStream() {
        // create write stream
        this.logStream = fs.createWriteStream(this.logFile, { flags: "a" });
        // get size of logs.txt file (USED ONLY IN STARTUP, OTHERWISE WILL ERROR OUT ALWAYS)
        fs.stat(this.logFile, (err, stats) => {
            if (err) return console.error(err);
            console.log("Size of file is", stats.size, "bytes");
            // check if file is bigger than 50MB
            if (stats.size > this.config.maxFileSize) {
                // rotate log file
                this.rotate();
            }
        });
    }

    checkOldFiles() {
        // check if there are old files in the directory by checking the date on the file name
        fs.readdir(this.logFilePath, (err, files) => {
            if (err) return console.error(err);
            files.forEach(file => {
                // check if file is a log file
                if (file.includes("echo_")) {
                    // check if file is older than 30 days
                    const date = new Date();
                    const fileNameToDate = file.split("echo_")[1].split(".log")[0].replace(/-/g, "-").replaceAll(".", ":").split(" ").join("T").toString().concat(".000Z");
                    const fileDate = new Date(fileNameToDate);
                    const diffTime = Math.abs(date - fileDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    // if file is older than 30 days, delete it
                    if (diffDays > this.config.maxFilesDateDays) {
                        fs.unlink(path.resolve(this.logFilePath, file), (err) => {
                            if (err) return console.error(err);
                            console.log(`Deleted old log file ${file}`);
                        });
                    }
                }
            });
        });
    }

    checkFolder() {
        // check if this.path contains a subdirectory and check if folders exist, 
        if (this.path.includes("/")) {
            const folders = this.path.split("/");
            let folderPath = "./";
            folders.forEach(folder => {
                folderPath = path.join(folderPath, folder);
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
            });
        }
    }

    checkFile() {
        // check if file exists
        if (!fs.existsSync(this.logFile)) {
            // create file
            fs.writeFileSync(this.logFile, "");

            // create new stream after create
            if (this.logStream) {
                this.logStream.end();
                this.logStream = null;
                this.createStream();
            }
        }
    }

    rotate() {
        return new Promise((resolve, reject) => {
            this.checkFolder();
            this.checkFile();
            this.checkOldFiles();
            // rename file
            const date = new Date();
            // create new log file and rename adding date as DD/MM/YYYY HH.MM.SS
            const newFile = path.resolve(this.path, `echo_${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)} ${('0' + date.getHours()).slice(-2)}.${('0' + date.getMinutes()).slice(-2)}.${('0' + date.getSeconds()).slice(-2)}.log`);
            // rename the current log file to the new path
            fs.rename(this.logFile, newFile, () => {
                this.logStream.end();
                this.logStream = null;
                // create new stream after rename
                this.createStream();
                resolve();
            });
        });
    }

    async log(...args) {
        this.checkFile();
        // check if args have array or object, if so, stringify it
        args = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg);
            } else {
                return arg;
            }
        });
        // add date to log as DD/MM/YYYY HH:MM:SS
        const date = new Date();
        // check if date is single digit, if so, add a 0 before it
        var dateString = `[${date.getDate() < 10 ? "0" + date.getDate() : date.getDate()}/${date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1}/${date.getFullYear()} ${date.getHours() < 10 ? "0" + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds()}]`;
        args.unshift(this.internalId + " | " + dateString + " | INFO");
        // create message
        const message = Array.from(args).join(" ") + "\r\n"
        // write to stdout
        process.stdout.write(message);
        // write to log file
        if (!this.logStream) return;
        this.logStream.write(message);
        // check if file size is bigger than 50MB
        if (this.logStream.bytesWritten > this.config.maxFileSize) {
            // rotate log file
            await this.rotate();
        }
    }

    async error(...args) {
        this.checkFile();
        // check if args have array or object, if so, stringify it
        args = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg);
            } else {
                return arg;
            }
        });
        // add date to log as DD/MM/YYYY HH:MM:SS
        const date = new Date();
        // check if date is single digit, if so, add a 0 before it
        var dateString = `[${date.getDate() < 10 ? "0" + date.getDate() : date.getDate()}/${date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1}/${date.getFullYear()} ${date.getHours() < 10 ? "0" + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds()}]`;
        args.unshift(this.internalId + " | " + dateString + " | ERROR");
        // create message
        const message = Array.from(args).join(" ") + "\r\n"
        // write to stdout
        process.stdout.write(message);
        // write to log file
        if (!this.logStream) return;
        this.logStream.write(message);
        // check if file size is bigger than 50MB
        if (this.logStream.bytesWritten > this.config.maxFileSize) {
            // rotate log file
            await this.rotate();
        }
    }

    async warn(...args) {
        this.checkFile();
        // check if args have array or object, if so, stringify it
        args = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg);
            } else {
                return arg;
            }
        });
        // add date to log as DD/MM/YYYY HH:MM:SS
        const date = new Date();
        // check if date is single digit, if so, add a 0 before it
        var dateString = `[${date.getDate() < 10 ? "0" + date.getDate() : date.getDate()}/${date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1}/${date.getFullYear()} ${date.getHours() < 10 ? "0" + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds()}]`;
        args.unshift(this.internalId + " | " + dateString + " | WARN");
        // create message
        const message = Array.from(args).join(" ") + "\r\n"
        // write to stdout
        process.stdout.write(message);
        // write to log file
        if (!this.logStream) return;
        this.logStream.write(message);
        // check if file size is bigger than 50MB
        if (this.logStream.bytesWritten > this.config.maxFileSize) {
            // rotate log file
            await this.rotate();
        }
    }
}

module.exports = { Logger };