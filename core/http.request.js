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
        httpRequest.qs = Object.assign(sec, body);
        // httpRequest.useQuerystring = true;
    } else {
        if (body && body.formData) {
            headers['Content-Type'] = 'multipart/form-data';
            Object.assign(body.formData, sec);
            Object.assign(httpRequest, body);
        } else {
            httpRequest.body = JSON.stringify(Object.assign(sec, body));
        }
    }

    return httpRequest;
}

exports.httpClient = httpRequest => new Promise((resolve, reject) => {
    //console.log(httpRequest);
    console.log(`making ${httpRequest.method} request to  ${httpRequest.uri}`);
    request(httpRequest, (error, response, body) => {
        try {
            const responseData = JSON.parse(body || '{"message": "Internal Error please try again"}');
            if (!error && response.statusCode == 200) {
                resolve(responseData);
            } else {
                reject(responseData.message);
            }
        } catch (e) {
            console.error(e.message);
        }
    });
})