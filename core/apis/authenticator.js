const { prompt } = require('../prompt');
const session = require('../session');
const httpRequestClient = require('../http.request');
module.exports = (force) => new Promise(async(resolve, reject) => {
    var sessionData = session.get();
    if (sessionData && !force) {
        if ((+new Date) > sessionData.tokens.expires_at) {
            // get a new token
            console.info('reauthorizing...');
            const httpRequest = httpRequestClient.httpRequestObject('POST', '/user/reauthorize', {
                refresh_token: sessionData.tokens.refresh_token
            }, null, true);
            httpRequestClient.httpClient(httpRequest).then(tokens => {
                Object.assign(sessionData, tokens);
                session.store(sessionData);
                resolve(true);
            }, err => reject(false));

            return null;
        }
        return resolve(true);
    }

    const postData = await prompt([{
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
    const httpRequest = httpRequestClient.httpRequestObject('POST', '/user/authorize', postData, null, true);
    
    httpRequestClient.httpClient(httpRequest).then(response => {
        console.log(`User authorized: ${response.userInfo.email}`)
        session.store(response);
        resolve(true);
    }, (err) => (console.error(err), reject(false)));
})