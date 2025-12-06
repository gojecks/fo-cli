const httpClient = require('../http');
const utils = require('../utils');
const foJson = utils.foJson.get();
const { editor, promptName } = require('../prompt');
const getAppApis = orgAndApp => {
    const apis = foJson[orgAndApp.organisation].apps[orgAndApp.appName].apis;
    return (apis || []).filter(item => !item.NO_CTRL).map(item => item.CTRL_NAME);
}

const pushController = async (orgAndApp, apiName) => {
    const filePath = `/functions/controller/${apiName}.php`;
    const hookFilePath = `${orgAndApp.organisation}/${orgAndApp.appName}${filePath}`;
    const template = utils.readFile(utils.getPath(hookFilePath));
    if (template != null) {
        const response = await httpClient('PUT', '/cms/file/update', { template, filePath }, orgAndApp);
        if (response) {
            console.log(`Controller ${apiName} saved`);
        } else {
            console.log(`Unable to save controller ${apiName}`);
        }
    } else {
        console.log('Nothing to push');
    }
};

class Controllers {
    static withInstance = {
        skip: [],
        action: {
            push: false,
            push_all: false,
            rm: false,
            list: false,
            load: false
        }
    };

    static async load(orgAndApp){
        const apis = getAppApis(orgAndApp);
        for (const api of apis) {
            try {
                const filePath = `functions/controller/${api}.php`;
                const { content } = await httpClient('GET', '/cms/file', { filePath }, orgAndApp);
                if (content) {
                    console.log(`contents loaded for ${api} hook`);
                    const hookFilePath = `${orgAndApp.organisation}/${orgAndApp.appName}/${filePath}`;
                    utils.writeFile(hookFilePath, content);
                }
            } catch (e) {
                console.log(`Failed to load ${api} content`)
            }
        }
    };
    
    static async push (orgAndApp){
        const apis = getAppApis(orgAndApp);
        const apiName = await promptName(apis);
        await pushController(orgAndApp, apiName);
    }
    
    static async push_all(){
        const apis = getAppApis(orgAndApp);
        for(const api of apis) {
            await pushController(orgAndApp, api);
        }
    }
}

module.exports = Controllers;