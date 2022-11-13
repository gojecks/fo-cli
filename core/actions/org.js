const fs = require('fs');
const utils = require('../utils');
const foJson = utils.foJson.get();
const session = require('../session');
const push = require('../apis/push');
const { prompt } = require('../prompt');
const fetch = require('../apis/fetch');

exports.new = async() => {
    const numRows = require('../apis/num_rows');
    const answers = await prompt([{
        type: "input",
        name: "organisation",
        "message": "Enter organisation"
    }]);

    if (answers.organisation) {
        const msg = `Organisation ${answers.organisation} already exists please enter a new name`;
        if (foJson && foJson.hasOwnProperty(answers.organisation)) {
            console.error(msg);
        } else {
            const isExists = await numRows({
                name: answers.organisation
            }, { tableName: 'organisation' });
            if (!isExists) {
                const sessionData = session.get();
                var postData = [{
                    name: answers.organisation,
                    email: sessionData.userInfo.email,
                    created: +new Date,
                    UID: sessionData.userId,
                    role: "ROLE_SUPER_ADMIN",
                    pending: false,
                    username: sessionData.userInfo.fullname
                }];

                const response = await push(postData, 'insert', {
                    tableName: 'organisation'
                });

                if (response.result) {
                    postData.id = response.uuids[0];
                    addToStorage(answers.organisation, postData);
                    console.log(`created ${answers.organisation}`)
                }
            } else {
                console.error(msg);
            }
        }
    }
}

exports.rm = async() => {
    const answers = await prompt([{
        type: "list",
        name: "organisation",
        choices: Object.keys(foJson),
        "message": "Select organisation to delete"
    }]);

    if (answers.organisation) {
        var data = foJson[answers.organisation];
        const sessionData = session.get();
        if (sessionData.userId !== data.uid) {
            console.log(`Unable to remove organisation ${answers.organisation}`);
            return;
        }

        const response = await push(data.id, 'delete', {
            tableName: 'organisation'
        });

        if (response.result) {
            const appIds = Object.reduce(data.apps).map(app => data.apps[app].appId);
            rmFromStorage(answers.organisation);
            if (appIds.length) {
                console.log('remove all apps...');
                await push(appIds, 'delete', {
                    tableName: 'user_db'
                });
            }
        } else {
            console.log(`Unable to remove organisation ${answers.organisation}`);
        }
    }
}

exports.load = async() => {
    const sessionData = session.get(true);
    const orgs = await fetch([{ email: sessionData.userInfo.email }], { tableName: "organisation" })
        .catch(console.log);
    if (orgs) {
        orgs.forEach(org => {
            org._data.id = org._ref;
            addToStorage(org._data.name, org._data);
        });
        console.log('Organisation updated');
    }
}

function addToStorage(orgName, data) {
    if (!foJson[orgName]) {
        foJson[orgName] = {
            created: +new Date,
            teams: [],
            apps: {},
            ...data
        };
        fs.mkdirSync(utils.getPath(orgName), { recursive: true });
    } else {
        Object.assign(foJson[orgName], data);
    }

    utils.foJson.set(foJson);
}

function rmFromStorage(orgName) {
    delete foJson[orgName];
    fs.rmSync(utils.getPath(orgName), { recursive: true })
    utils.foJson.set(foJson);
}