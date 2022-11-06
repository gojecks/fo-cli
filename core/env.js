const minimist = require('minimist');
const args = minimist(process.argv);
const appName = args.appName || 'jFrontEndOnly';
const organisation = args.organisation || 'JELIJS';
const authServerKey = "8411a161e5e9dab188ba4b559d1bbc8d38dc6a15";
const vars = {
    local: {
        apiHost: "http://api.frontendonly.com.local",
        apiKey: "41fe6641a1ef3e8988c54822649636d8fbdf95d2",
        origin: "localhost",
        appName,
        organisation,
        authServerKey
    },
    prod: {
        apiHost: "https://api.frontendonly.com",
        apiKey: "2e3e1771df789b9767ae5bc8f9bed48451869f5e",
        origin: "frontendonly.com",
        appName,
        organisation,
        authServerKey
    }
};

const env = args.env || 'local';
module.exports = {
    args,
    env,
    config: vars[env],
};