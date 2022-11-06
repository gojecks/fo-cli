const { prompt } = require('../prompt');
const session = require('../session');
const httpRequestClient = require('../http.request');
module.exports = () => new Promise(async(resolve, reject) => {
    var sessionData = session.get();
    if (sessionData) {
        if ((+new Date) > sessionData.tokens.expires_at) {
            // get a new token
            console.info('reauthorizing...');
            const httpRequest = httpRequestClient.httpRequestObject('POST', '/user/reauthorize', {
                postData: {
                    refresh_token: sessionData.tokens.refresh_token
                }
            }, null, true);
            httpRequestClient.httpClient(httpRequest).then(tokens => {
                sessionData.tokens = tokens.tokens;
                session.store(sessionData);
                resolve(true);
            }, err => reject(false));

            return null;
        }
        return resolve(true);
    }

    const form = await prompt([{
            message: "Email address",
            type: "input",
            name: "email"
        },
        {
            message: "Enter your password",
            type: "password",
            name: "password"
        }
    ]);

    console.info(`Please wait while we log you in....`);
    const httpRequest = httpRequestClient.httpRequestObject('POST', '/user/authorize', {
        postData: {
            param: form,
            "limit": "JDB_SINGLE"
        }
    }, null, true);
    httpRequestClient.httpClient(httpRequest).then(response => {
        session.store(response);
        resolve(true);
    }, (err) => (console.error(err), reject(false)));
})