const fs = require('fs');
const utils = require('../utils');
const foJson = utils.foJson.get();
const session = require('../session');
const push = require('../apis/push');
const httpClient = require('../http');
const { prompt, orgAndAppQuest, validate } = require('../prompt');
const fetch = require('../apis/fetch');
const appStorage = ['FO (Free)', 'F1 ($10)', 'F2 ($15)', 'F3 ($40)', 'F4 ($80)'];
const pf = { Monthly: 1, Quaterly: 3, 'Semi-Annual': 6, Yearly: 12 };
const pfR = {1: 'Monthly', 3: 'Quaterly', 6: 'Semi Annual', 12: 'Yearly'};
const organisations = Object.keys(foJson);

exports.new = async() => {
    if (!organisations.length) {
        console.log('Please create an organisation before creating app');
        return;
    }

    var questions = [{
            type: "input",
            message: "Application name:",
            name: "db_name",
            validate: function(input) {
                const done = this.async();
                if (!new RegExp("\^[a-zA-Z0-9-]+$").test(input)) {
                    done('Only alpha-umeric allowed');
                    return;
                }
                done(null, true)
            }
        },
        {
            type: "input",
            message: "Version (numbers only):",
            name: "version",
            default: 1,
            validate: function(input) {
                const done = this.async();
                if (!(/[0-9.]+$/g.test(input))) {
                    done('Only nnumbers allowed');
                    return;
                }

                done(null, true)
            }
        },
        {
            type: "list",
            choices: appStorage,
            default: 2,
            message: "Select storage",
            name: "storage"
        },
        {
            type: "list",
            choices: Object.keys(pf),
            default: 2,
            name: "payment_frequency"
        },
        {
            type: "input",
            message: "Description:",
            name: "version"
        },
        {
            type: "list",
            choices: organisations,
            message: "Select organisation:",
            name: "organisation"
        },
        {
            type: "confirm",
            message: "In market place:",
            default: true,
            name: "in_market"
        }
    ]

    const numRows = require('../apis/num_rows');
    const answers = await prompt(questions);
    const isExists = await numRows({
        db_name: answers.db_name,
        organisation: answers.organisation
    }, { tableName: 'user_db' });
    if (!isExists) {
        const sessionData = session.get();
        answers.UID = sessionData.userId;
        answers.storage = appStorage.indexOf(answers.storage);
        answers.payment_frequency = pf[answers.payment_frequency];
        const response = await push(answers, 'insert', {
            tableName: 'user_db'
        });

        if (response.result) {
            answers.id = response.uuids[0];
            addToStorage(answers.db_name, answers);
            console.log(`created app ${answers.db_name}`);
        }
    } else {
        console.log(`Application ${answers.db_name} already exists`);
    }
}

exports.rm = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    console.log(`deleting app ${orgAndApp.appName}...`);
    const response = await push(foJson[orgAndApp.organisation].apps[orgAndApp.appName].id, 'delete', {
        tableName: 'user_db'
    });

    if (response.result) {
        rmFromStorage(orgAndApp.organisation, orgAndApp.appName);
        console.log(`app removed`);
    } else {
        console.log('[App:rm] Unable to remove app from server');
    }
}

exports.info = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const response = await httpClient('GET', '/application/info', null, orgAndApp)
        .catch(console.log);

    if (response) {
        console.log(response);
    }
}

exports.conf = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const appData = foJson[orgAndApp.organisation].apps[orgAndApp.appName];
    const postData = await prompt([{
            type: "input",
            name: "access_token_time",
            message: "Access token limit (seconds)",
            default: (appData.config && appData.config['access_token_time'] || 1500),
            validate: validate.numbers
        },
        {
            type: "input",
            name: "refresh_token_time",
            default: (appData.config && appData.config['refresh_token_time'] || 2592000),
            message: "refresh token limit (seconds)",
            validate: validate.numbers
        },
        {
            type: "input",
            name: "maximumTokenPerUser",
            message: "Maximum token per user",
            default: (appData.config && appData.config['maximumTokenPerUser'] || 1),
            validate: validate.numbers
        }
    ]);

    const response = await httpClient('PUT', '/application/configuration/update', postData, orgAndApp)
        .catch(console.log);

    if (response) {
        appData.config = Object.assign((appData.config || {}), postData);
        addToStorage(orgAndApp.appName, appData, true);
        console.log(`app configuration updated`);
    }
}

exports.load = async(organisation) => {
    const orgResponse = await orgAndAppQuest(foJson, true, {organisation});
    const apps = await fetch([orgResponse], { tableName: "user_db" })
        .catch(console.log);
    if (apps) {
        apps.forEach(app => {
            app._data.id = app._ref;
            addToStorage(app._data.db_name, app._data);
        });
        console.log('apps updated');
    }
}

exports.check_and_update = async(organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const response = await httpClient('POST', '/application/update/check', {  overrideSchemaIfNewer: true }, orgAndApp)
        .catch(console.log);

    if (response) {
        console.log(response);
    }
}

exports.list = async(organisation) => {
    const orgAndApp = await orgAndAppQuest(foJson, true, {organisation});
    const apps = foJson[orgAndApp.organisation].apps;
    const appNames = Object.keys(apps);
    if (!appNames.length) return console.log(`No apps created!`);
    const details = appNames.map(name => `${name}  - ${appStorage[apps[name].storage]} - Ver(${apps[name].version}) - PF (${pfR[apps[name].payment_frequency]})`);
    console.log(details.join('\n'));
}


function addToStorage(appName, data) {
    const apps = foJson[data.organisation].apps;
    if (!apps[appName]) {
        data.sites = {};
        data.apis = [];
        data.config = null;
        apps[appName] = data;
        const appPath = utils.getPath(data.organisation, appName);
        fs.mkdirSync(appPath, { recursive: true });
        ['functions', 'functions/controller', 'functions/hooks', 'templates'].forEach(filePath => {
            fs.mkdirSync(`${appPath}/${filePath}`);
        });
    } else {
        Object.assign(apps[appName], data);
    }
    utils.foJson.set(foJson);
}

function rmFromStorage(orgName, appName) {
    delete foJson[orgName].apps[appName];
    fs.rmSync(utils.getPath(orgName, appName), { recursive: true });
    utils.foJson.set(foJson);
}