const authenticate = require('./apis/authenticator');
const httpRequestClient = require('./http.request');
let pendingRequest = false;

module.exports = (httpRequest) => {
    if (pendingRequest) {
        return httpRequestClient.httpClient(httpRequest);
    } else {
        pendingRequest = true;
        return new Promise((resolve, reject) => {
            console.log(`authenticating user before making request..`);
            authenticate().then(() => {
                httpRequestClient.setAuthorization(httpRequest);
                httpRequestClient.httpClient(httpRequest).then(resolve, reject);
            }).catch(err => {
                console.log(err)
                console.log(`Unable to complete request due to authentication error, please try again`);
            });
        });
    }
}