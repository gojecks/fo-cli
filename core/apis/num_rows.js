const httpClient = require('../http');
const numRowApi = '/database/num/rows';
/**
 * 
 * @param {*} param
 * @param {*} appInfo 
 * @returns 
 */
module.exports = async(param, appInfo) => {
    const response = await httpClient('POST', numRowApi, { query: { param }, return_type: "num_rows" }, appInfo, true)
        .catch(err => console.error(`[NUM_ROWS] ${err}`));

    if (response) {
        return !!response._jDBNumRows;
    }

    return true;
}