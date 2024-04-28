const sqlite = require('sqlite3');
const path = require('path');
const fs = require('fs');

class CacheHandler {
  constructor(config) {
    this.config = config.database;
    this.path = this.config.sqliteCachingConfig.location;

    if (this.config.enableSqliteCaching) {
      this.checkCacheFolder();
      this.dbPath = path.resolve("./", this.path, this.config.sqliteCachingConfig.fileName);
      console.log(this.dbPath);
      this.db = new sqlite.Database(this.dbPath);
    }
  }

  checkCacheFolder() {
    if (this.path.includes("/")) {
      const folders = this.path.split("/");
      let folderPath = "./";
      folders.forEach(folder => {
        folderPath = path.join(folderPath, folder);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
      });
    }
  }

}

module.exports = CacheHandler;