const httpClient = require('../http');
const fetchApi = '/database/fetch';

/**
 * 
 * @param {*} param 
 * @param {*} appInfo 
 */
module.exports = async(param, appInfo) => {
    const query = {
        limit: "JDB_MAX",
        mode: 1,
        type: "_",
        where: param
    };

    const response = await httpClient('POST', fetchApi, { query }, appInfo)
        .catch(console);

    return response;
}