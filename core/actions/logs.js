const httpClient = require('../http');
const env = require('../env');
const utils = require('../utils');
const foJson = utils.foJson.get();
const logApi = '/application/logs';

/**
 * pass --searchCriteria to search logs for details
 */
class Logs {
    static withInstance = {
        skip: [],
        action: {
            get: false,
            clear: false
        }
    };

    static async get(orgAndApp){
        const response = await httpClient('GET', logApi, {
                query: {
                    searchCriteria: env.args.searchCriteria
                }
            }, orgAndApp)
            .catch(console.log);
    
        if (response) {
            console.groupCollapsed(response.logs.join('\n'))
        }
    }
    
    static async clear(orgAndApp){
        const response = await httpClient('DELETE', logApi + '/remove', {}, orgAndApp)
            .catch(console.log);
    }
}

module.exports = Logs;