const httpClient = require('../http');
const env = require('../env');
const utils = require('../utils');
const foJson = utils.foJson.get();
const { orgAndAppQuest } = require('../prompt');
const logApi = '/application/logs';

/**
 * pass --searchCriteria to search logs for details
 */
exports.get = async(organisation, appName) => {
    const appInfo = await orgAndAppQuest(foJson, false, {organisation, appName});
    const response = await httpClient('GET', logApi, {
            query: {
                searchCriteria: env.args.searchCriteria
            }
        }, appInfo)
        .catch(console.log);

    if (response) {
        console.groupCollapsed(response.logs.join('\n'))
    }
}

exports.clear = async(organisation, appName) => {
    const appInfo = await orgAndAppQuest(foJson, false, {organisation, appName});
    const response = await httpClient('DELETE', logApi + '/remove', {}, appInfo)
        .catch(console.log);
}