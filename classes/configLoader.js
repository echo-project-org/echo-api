import fs from 'fs';
import path from 'path';

class Loader {
    constructor() {
        let cfg;
        const configPath = path.resolve('./config.json');
        const configTemplatePath = path.resolve('./config_template.json');

        try {
            if (fs.existsSync(configPath)) {
                cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } else {
                console.warn("config.json not found. Falling back to config_template.json.");
                cfg = JSON.parse(fs.readFileSync(configTemplatePath, 'utf-8'));
            }
        } catch (e) {
            console.error("Error reading configuration files:", e);
            throw new Error("Failed to load configuration.");
        }

        this.port = cfg.port;
        this.ssl = cfg.ssl;
        this.config = cfg;
    }

    getCfg() {
        return this.config;
    }
}

export default Loader;