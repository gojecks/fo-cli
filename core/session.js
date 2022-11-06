const fs = require('fs');
const path = '.jeli.session';
const env = require('./env');
let cacheData = null;
module.exports = {
    store: (data) => {
        let rec = this.get() || {};
        rec[env.env] = data;
        cacheData = data;
        fs.writeFileSync(path, JSON.stringify(rec, null, 3));
    },
    get: () => {
        if (!cacheData) {
            try {
                let sessionData = fs.readFileSync(path, 'utf-8');
                if (sessionData) {
                    sessionData = JSON.parse(sessionData);
                }
                cacheData = sessionData[env.env] || null;
            } catch (e) {}
        }

        return cacheData;
    }
};