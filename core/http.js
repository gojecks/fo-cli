const httpRequest = require('./http.request');
const httpMiddleWare = require('./http.middleware');
module.exports = (method, path, body, appInfo, basicMode) => {
    return httpMiddleWare(httpRequest.httpRequestObject(method, path, body, appInfo, basicMode));
}