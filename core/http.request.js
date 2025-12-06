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

    const host = appInfo?.env ? `https://${appInfo?.env}/api` : env.config.apiHost; 
    const httpRequest = ({ method, url: `${host}${path}`, headers });
    if (method.toLowerCase() === 'get') {
        httpRequest.params = body;
    } else {
        httpRequest.data = body;
    }

    return httpRequest;
}

exports.setAuthorization = (httpRequest, token) => {
    token = token || session.getKey('tokens').bearer;
    httpRequest.headers['Authorization'] = `Bearer ${token}`;
}

exports.httpClient = httpRequest => new Promise((resolve, reject) => {
    if (httpRequest.data && httpRequest.data.formData){
        httpRequest.data = httpRequest.data.formData;
        const maxRate = 1 * 1024 * 1024;
        Object.assign(httpRequest, {
            maxRate: [maxRate],
            onUploadProgress: ({ progress, rate }) => {
                console.log(`Upload [${(progress * 100).toFixed(2)}%]: ${sizeConversion(rate | maxRate)}/s`)
            }
        });
       httpRequest.headers['Content-Type'] = 'multipart/form-data';
    }

    console.log(`Processing Request ${httpRequest.url}...`);
    request(httpRequest).catch(err => {
        if (err.response) {
            const data = err.response.data || { 'message': 'Error performing request, please try again' };
            reject(data);
        }
    }).then(res => {
        if (res?.data) {
            resolve(res.data);
        }
    });
});
