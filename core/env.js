const fs = require('fs');
const minimist = require('minimist');
const args = minimist(process.argv);
const { getPath, getFile } = require('./utils');
const envPath = '.env';
const envVars = getFile(envPath, true);

let env = 'prod';
let config = {
    apiHost: "https://api.frontendonly.com",
    apiKey: "2e3e1771df789b9767ae5bc8f9bed48451869f5e",
    origin: "frontendonly.com",
    appName: "jFrontEndOnly",
    organisation: "JELIJS",
    authServerKey: "8411a161e5e9dab188ba4b559d1bbc8d38dc6a15"
};

if (envVars) {
    Object.assign(config, envVars[envVars.default] || {});
    env = envVars.default || env;
}

const setConfig = value => fs.writeFileSync(getPath(envPath), JSON.stringify(value, null, 3));
const getConfig = () => (envVars || {});

module.exports = {
    env,
    config,
    args,
    setConfig,
    getConfig
};