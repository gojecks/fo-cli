const fs = require('fs');
const utils = require('./utils');
const filePath = '.session';
const env = require('./env');
let cacheData = null;

exports.store = (data) => {
    let rec = {};
    rec[env.env] = data;
    cacheData = data;
    utils.writeFile(filePath, rec, true);
};

exports.get = (destroyProcess) => {
    if (!cacheData) {
        try {
            let sessionData = utils.getFile(filePath, true);
            if (sessionData) {
                cacheData = sessionData[env.env] || null;
            }
        } catch (e) {
            if (destroyProcess) {
                console.log(`No active session, please login and try again`);
                process.exit(0);
            }
        }
    }

    return cacheData;
}

exports.getKey = key => {
    return cacheData[key];
}