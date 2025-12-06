const fs = require('fs');
const utils = require('./utils');
const filePath = '.session';
const env = require('./env');
let cacheData = null;
const getTokenKey = appInfo => `${appInfo.organisation}:${appInfo.appName}`;

class Sessions {
    static store(data){
        cacheData = cacheData || {};
        cacheData[env.env] = data;
        utils.writeFile(filePath, cacheData, true);
    }
    
    static storeAssumedRoleToken(appInfo, token){
        if (!cacheData[env.env].assumedRoles) {
            cacheData[env.env].assumedRoles = {};
        }
        // store the assumedToken
        cacheData[env.env].assumedRoles[getTokenKey(appInfo)] = token;
        utils.writeFile(filePath, cacheData, true);
    };
    
    static getAssumedRoleToken(appInfo){
        const assumedRoles = cacheData[env.env]?.assumedRoles;
        return assumedRoles ? assumedRoles[getTokenKey(appInfo)] : null;
    }
    
    static get(destroyProcess){
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
    
    static getKey(key){
        return cacheData[env.env][key];
    }
}

module.exports = Sessions;
