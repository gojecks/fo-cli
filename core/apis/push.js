const httpClient = require('../http');
const pushApi = '/database/push';
const { v4: uuidv4 } = require('uuid');
/**
 * 
 * @param {*} data 
 * @param {*} state 
 * @param {*} config 
 */
module.exports = async(data, state, config) => {
    const postData = {
        data: {}
    };
    config = config || {};
    data = !Array.isArray(data) ? [data] : data;
    let uuids = [];
    const dataConstructor = {
        insert: () => {
            if (Array.isArray(data)) {
                return data.map(item => {
                    uuids.push(uuidv4())
                    return {
                        _ref: uuids[uuids.length - 1],
                        _data: item
                    }
                })
            }
        },
        delete: () => {
            return data;
        },
        update: () => {
            return data;
        }
    }[state];

    if (dataConstructor) {
        postData.data[state] = dataConstructor();
        const result = await httpClient('PUT', pushApi, postData, config, false)
            .catch(err => console.log(`[Push] ${err || 'unable to push data to server'}`));
        return {
            uuids,
            result
        };
    } else {
        console.log(`[Push] Invalid state received, please use (insert|update|delete)`);
        return null;
    }
}