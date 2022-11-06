const jeliDB = require('../../jeli-db/dist/jdb');
const env = require('./env');
const httpClient = require('./http');

module.exports = (async() => {
    const response = await jeliDB(env.config.appName, 1)
        .isClientMode()
        .open({
            live: 1,
            organisation: env.config.organisation,
            serviceHost: env.config.apiHost,
            http: httpClient,
            interceptor: function(options, request) {
                var token = "Basic " + environment.jeliApi;
                if (request.AUTH_TYPE == 1) {
                    var access = foTokenService.getAccessToken();;
                    if (access) {
                        token = "Bearer " + access.bearer;
                    }
                }

                options.headers.Authorization = token;
                return options;
            },
            useFrontendOnlySchema: false,
            storage: 'memory',
            disableApiLoading: true,
            alwaysCheckSchema: false,
            enableSocket: false
        });
    return {
        serviceHost: response.result.synchronize().Entity().configSync({}),
        core: response.result
    };
})();