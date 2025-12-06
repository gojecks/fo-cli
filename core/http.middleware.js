const authenticate = require('./apis/authenticator');
const httpRequestClient = require('./http.request');
let pendingRequest = false;

module.exports = (httpRequest, appInfo) => {
    if (pendingRequest) {
        return httpRequestClient.httpClient(httpRequest);
    } else {
        pendingRequest = true;
        const handleError = err => {
            console.log(err)
            console.log(`Unable to complete request due to authentication error, please try again`);
        };

        return new Promise((resolve, reject) => {
            console.log(`authenticating user before making request..`);
            authenticate.connect(false, appInfo).then(force => {
                authenticate.assumeRole(appInfo, force).then(token => {
                    httpRequestClient.setAuthorization(httpRequest, token);
                    httpRequestClient.httpClient(httpRequest).then(resolve, reject);
                }, handleError);
            }).catch(handleError);
        });
    }
}