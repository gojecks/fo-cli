const fs = require('fs');
const utils = require('./utils');
const filePath = '.session';
const env = require('./env');
let cacheData = null;

exports.store = (data) => {
    cacheData = cacheData || {};
    cacheData[env.env] = data;
    utils.writeFile(filePath, cacheData, true);
};

exports.get = (destroyProcess) => {
    if (!cacheData) {
        try {
            let sessionData = utils.getFile(filePath, true);
            cacheData = sessionData || {};
        } catch (e) {
            if (destroyProcess) {
                console.log(`No active session, please login and try again`);
                process.exit(0);
            }
        }
    }

    return cacheData[env.env];
}

exports.getKey = key => {
    return cacheData[env.env][key];
}