const btoa = require('btoa');
const env = require('./env');
const session = require('./session');
const request = require('request');

/**
 * 
 * @param {*} method 
 * @param {*} path 
 * @param {*} body 
 * @param {*} appInfo 
 * @param {*} basicMode 
 * @returns 
 */
exports.httpRequestObject = (method, path, body, appInfo, basicMode) => {
    appInfo = appInfo || {};
    const sessionData = session.get();
    const accessToken = (!sessionData || basicMode) ? env.config.apiKey : sessionData.tokens.bearer;
    const appName = appInfo.appName || env.config.appName;
    const headers = ({
        'User-Agent': 'JELI-CLI',
        'Authorization': `${(!sessionData || basicMode) ? 'Basic' :'Bearer'} ${accessToken}`,
        'Content-Type': 'application/json',
        'X-APP-NAME': appName,
        'X-APP-ORGANISATION': appInfo.organisation || env.config.organisation,
        'origin': env.config.origin
    });
    // push the SERVER-KEY
    if (!basicMode && (appInfo.appName && accessToken)) {
        headers['X-AUTH-SERVER-KEY'] = env.config.authServerKey;
    }

    var httpRequest = ({ method, uri: `${env.config.apiHost}${path}`, headers });
    var sec = { _h: "nds:4111", _r: btoa(`${appName}:${appInfo.tableName}:${+new  Date}:`) };
    if (method.toLowerCase() === 'get') {
        httpRequest.uri += '?' + Object.keys(sec).map(key => `${key}=${sec[key]}`).join('&');
    } else {
        if (body.formData) {
            headers['Content-Type'] = 'multipart/form-data';
            Object.assign(body.formData, sec);
            Object.assign(httpRequest, body);
        } else {
            httpRequest.body = JSON.stringify(Object.assign(sec, body));
            // httpRequest.json = true;
        }
    }

    return httpRequest;
}

exports.httpClient = httpRequest => new Promise((resolve, reject) => {
    // console.log(httpRequest);
    request(httpRequest, (error, response, body) => {
        console.log(`making request to ${httpRequest.uri}`);
        const responseData = JSON.parse(body);
        if (!error && response.statusCode == 200) {
            resolve(responseData);
        } else {
            reject(responseData.message || 'Internal Error please try again');
        }
    });
})