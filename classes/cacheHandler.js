const sqlite = require('sqlite3');
const path = require('path');

class CacheHandler {
  constructor(config) {
    this.config = config.database;
    if (this.config.enableSqliteCaching) {
      const location = path.join(__dirname, config.sqliteCachingConfig.location, config.sqliteCachingConfig.name); 
      // check if directory exists
      if (!fs.existsSync(path.join(__dirname, config.sqliteCachingConfig.location))) {
        fs.mkdirSync(path.join(__dirname, config.sqliteCachingConfig.location));
      }

      this.db = new sqlite.Database(location);
    }
  }
  

}

module.exports = CacheHandler;