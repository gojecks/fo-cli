const httpClient = require('../http');
const utils = require('../utils');
const foJson = utils.foJson.get();
const { prompt, orgAndAppQuest } = require('../prompt');

const getAppApis = orgAndApp => foJson[orgAndApp.organisation].apps[orgAndApp.appName].apis;

exports.load = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const response = await httpClient('GET', '/application/api', null, orgAndApp)
        .catch(console.log);

    if (response) {
        writeApi(orgAndApp, response);
    }
}

exports.create = async(organisation, appName) => {
    const questions = [{
            type: "list",
            name: "METHOD",
            choices: ['GET', 'POST', 'PUT', 'PATCH'],
            validate: function(input) {
                const done = this.async();
                if (!input) {
                    done('Please select a choice');
                    return;
                }

                done(null, true);
            },
            message: "Please select http method"
        },
        {
            type: "input",
            name: "URL",
            message: "Enter url",
            validate: function(input) {
                const done = this.async();
                if (!new RegExp("/+([a-zA-Z/])+").test(input)) {
                    done('You have entered an input url');
                    return;
                }

                done(null, true);
            }
        },
        {
            type: "list",
            name: "AUTH_TYPE",
            choices: ['Basic', 'Bearer', 'Any'],
            message: "Select auth type",
            default: 1
        },
        {
            type: "confirm",
            name: "PROTECTED_API",
            default: false,
            message: "Protected"
        },
        {
            type: "checkbox",
            name: "ROLES",
            message: "Select ROLES that can access this api (optional)",
            choices: ['ROLE_USER', 'ROLES_ADMIN', 'ROLES_SUPER_ADMIN']
        },
        {
            type: "confirm",
            name: "NO_CTRL",
            default: false,
            message: "Select yes to stop class generation"
        },
        {
            type: "input",
            name: "description",
            message: "Enter api description (optional)"
        }
    ];

    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const postData = await prompt(questions);
    postData.METHOD = postData.METHOD.toLowerCase();
    const response = await httpClient('POST', '/application/api/create', postData, orgAndApp)
        .catch(console.log);

    if (response) {
        console.log(`api created ${postData.METHOD}${postData.URL}`)
        writeApi(orgAndApp, postData);
    }
}

exports.rm = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const apis = getAppApis(orgAndApp);
    if (apis && apis.length) {
        const choices = apis.map(api => `${api.METHOD}${api.URL}`);
        const { api } = await prompt({
            name: "api",
            type: "list",
            choices
        });

        const response = await httpClient('DELETE', '/application/api/remove', { postData: apis[choices.indexOf(api)] }, orgAndApp)
            .catch(console.log);

        if (response) {
            console.log(`api removed ${api}`)
            writeApi(orgAndApp, api, true);
        }
    } else {
        console.log(`No apis created yet, please load from server or create a new one`);
    }
}

/**
 * 
 * @param {*} organisation 
 * @param {*} appName 
 */
exports.list  = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const apis = getAppApis(orgAndApp);
    if (apis){
        console.log(apis);
    }
}

/**
 * 
 * @param {*} orgAndApp 
 * @param {*} apis 
 * @param {*} remove 
 */
function writeApi(orgAndApp, apis, remove) {
    const appConfig = foJson[orgAndApp.organisation].apps[orgAndApp.appName];
    if (!appConfig.apis) {
        appConfig.apis = []
    }
    const existigApis = appConfig.apis.map(api => `${api.METHOD}${api.URL}`);
    const addApi = api => {
        const index = existigApis.indexOf(`${api.METHOD}${api.URL}`);
        if (index > -1) {
            appConfig.apis[index] = api;
        } else {
            appConfig.apis.push(api);
        }
    };

    if (!remove) {
        if (Array.isArray(apis)) {
            apis.forEach(addApi);
        } else {
            addApi(apis)
        }
    } else {
        const index = existigApis.indexOf(apis);
        if (index > -1) {
            appConfig.apis.splice(index, 1);
        }
    }

    // save the json
    utils.foJson.set(foJson);
}