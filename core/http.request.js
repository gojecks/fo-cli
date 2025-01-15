const btoa = require('btoa');
const env = require('./env');
const session = require('./session');
const request = require('axios');
const { sizeConversion } = require('./utils');

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
        'User-Agent': 'JELI-CLI Version 1.0.0',
        'Content-Type': 'application/json',
        'Authorization': `${(!sessionData || basicMode) ? 'Basic' : 'Bearer'} ${accessToken}`,
        'X-REQ-OPTS': btoa(`${appInfo.organisation || env.config.organisation}:${appName}:${appInfo.tableName || ''}:${Math.floor(+new Date / 1000) * 1000}:`),
        'origin': env.config.apiHost
    });
    // push the SERVER-KEY
    if (!basicMode && (appInfo.appName && accessToken)) {
        headers['X-AUTH-SERVER-KEY'] = env.config.authServerKey;
    }

    var httpRequest = ({ method, url: `${env.config.apiHost}${path}`, headers });
    if (method.toLowerCase() === 'get') {
        httpRequest.params = body;
        // httpRequest.useQuerystring = true;
    } else {
        if (body && body.formData) {
            headers['Content-Type'] = 'multipart/form-data';
            // attach upload listener
            const maxRate = 1024 * 1024;
            Object.assign(httpRequest, {
                maxRate: [maxRate],
                onUploadProgress: ({progress, rate}) => {
                    console.log(`Upload [${(progress*100).toFixed(2)}%]: ${sizeConversion(rate | maxRate)}/s`)
                }
            });
            // set the body
            body = body.formData;
        }

        httpRequest.data = body;
    }

    return httpRequest;
}

exports.setAuthorization = httpRequest => {
    const token = session.getKey('tokens');
    httpRequest.headers['Authorization'] = `Bearer ${token.bearer}`;
}

exports.httpClient = httpRequest => new Promise((resolve, reject) => {
    console.log(`${httpRequest.method} ${httpRequest.url}`);
    request(httpRequest).catch(err => {
        if (err.response) {
            const data = err.response.data || {'message': 'Error performing resquest, please try again'};
            console.error(`HttpClient error: ${data.message}`);
            reject(data);
        }
    }).then(res => {
        if (res?.data) {
            resolve(res.data);
        }
    });
});
