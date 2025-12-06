const { prompt } = require('../prompt');
const session = require('../session');
const httpRequestClient = require('../http.request');

class Authenticator {
    static connect(force, appInfo){
        return new Promise(async(resolve, reject) => {
            const sessionData = session.get();
            if (sessionData && !force) {
                if ((+new Date) >= sessionData.tokens.expires_at) {
                    // get a new token
                    console.info('reauthorizing...');
                    const httpRequest = httpRequestClient.httpRequestObject('POST', '/user/reauthorize', {
                        refresh_token: sessionData.tokens.refresh_token
                    }, null, true);
                    httpRequestClient.httpClient(httpRequest).then(tokens => {
                        Object.assign(sessionData, tokens);
                        session.store(sessionData);
                       resolve(true);
                    }, err => reject(err));
        
                    return null;
                }
                return resolve(false);
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
            }, (err) => (console.error(err), reject(err.message || 'Authentication failed, please try again later..')));
        })
    }

    static assumeRole(appInfo, force){
        return new Promise((resolve, reject) => {
            if (appInfo.organisation && appInfo.appName){
                const assumedToken = session.getAssumedRoleToken(appInfo);
                if (assumedToken && !force) return resolve(assumedToken);

                console.log(`Assuming role for ${appInfo.organisation}:${appInfo.appName}`);
                const httpRequest = httpRequestClient.httpRequestObject('POST', '/oauth/assume/role', appInfo, null, true);
                httpRequestClient.setAuthorization(httpRequest);
                httpRequestClient.httpClient(httpRequest).then(response => {
                    const token = response.accessToken;
                    session.storeAssumedRoleToken(appInfo, token);
                    resolve(token);
                }, reject);
            } else {
                resolve(null);
            }
        });
    }
}

module.exports = Authenticator;

